// Here comes the oclif specific stuff
import Command, {flags} from '@oclif/command'
import {ApiPromise, Keyring, SubmittableResult, WsProvider} from "@polkadot/api";
import { xxhashAsHex} from "@polkadot/util-crypto";
import {AccountId, Balance, Hash, ModuleMetadataLatest, VestingInfo} from "@polkadot/types/interfaces";
import * as fs from 'fs';
import * as readline from 'readline';
import {
    checkAvailability,
    Dispatcher,
    StorageItemElement, PalletElement,
    parseModuleInput,
    StorageElement,
    getDefaultStorage
} from "../common/common";
import {StorageItem, transform, StorageValueValue, StorageMapValue, StorageDoubleMapValue} from "../transform/transform";
import {ApiTypes, SubmittableExtrinsic} from "@polkadot/api/types";
import {KeyringPair} from "@polkadot/keyring/types";
import {bool, StorageKey} from "@polkadot/types";
import {fork} from "../fork/fork";

const AvailableMigrations = [
    parseModuleInput("Balances.TotalIssuance"),
    parseModuleInput("System.Account"),
    parseModuleInput("Vesting.Vesting"),
    parseModuleInput("Proxy.Proxies"),
];

export default class MigrateCommand extends Command {
    fromApi: ApiPromise;
    toApi: ApiPromise;

    static description = 'migrate the state of an existing substrate-v2 based chain to a substrate-v3 based chain';

    static flags = {
        'source-network': flags.string({
            char: 's',
            description: 'the networks ws-endpoint the state shall be forked from',
            required: true,
        }),
        'destination-network': flags.string({
            char: 'd',
            description: 'the networks ws-endpoint the state shall be ported to',
            required: true,
        }),
        'from-block': flags.string({
            char: 'b',
            description: 'specify at which block to take the state from the chain. Input must be a block number.',
            default: '-1',
        }),
        'to-block': flags.string({
            char: 'b',
            description: 'specify at which block to insert the state from the chain. Input must be a block number.',
            default: '-1',
        }),
        'executor': flags.string({
            description: 'path to a json file, exported from polkadot-js, with which the migration shall be executed.',
            required: true,
        }),
        'modules': flags.string({
            char: 'm',
            multiple: true,
            description: 'defines additional modules that shall be migrated. Modules can be defined as `PALLET_NAME` or as `PALLET_NAME.STORAGE_ITEM`'
        }),
        'sequence': flags.string({
            multiple: true,
            description: 'defines the sequence of the migration. Modules can be defined as `PALLET_NAME` or as `PALLET_NAME.STORAGE_ITEM`. If not provided random sequence will be choosen.'
        }),
        'no-default': flags.boolean({
            description: 'Do not migrate the default modules. Namely: System, Balances, Proxy, Vesting',
        })
    };

    async run() {
        const {flags} = this.parse(MigrateCommand);

        if (flags["source-network"] === flags["destination-network"]) {
            // TODO: Log error and abort
        }

        let executor = await this.parseExecutor(flags["executor"]);

        const wsProviderFrom = new WsProvider(flags["source-network"]);
        const fromApi = await ApiPromise.create({
            provider: wsProviderFrom,
            types: {
                ProxyType: {
                    _enum: ['Any', 'NonTransfer', 'Governance', 'Staking', 'Vesting']
                }
            }
        });

        const wsProviderTo = new WsProvider(flags["destination-network"]);
        const toApi = await ApiPromise.create({
            provider: wsProviderTo,
            types: {
                ProxyType: {
                    _enum: ['Any', 'NonTransfer', 'Governance', '_Staking', 'NonProxy']
                }
            }
        });

        this.fromApi = fromApi;
        this.toApi = toApi

        // Transform modules input
        let storageItems = flags["modules"].map((value, index) => {
            return parseModuleInput(value);
        });

        if (!flags["no-default"]) {
            storageItems.push(...getDefaultStorage());
        }

        // Check if we can do this migration
        for(let item of storageItems) {
            if(!AvailableMigrations.includes(item)) {
                // TODO: Log error and abort
            }
        }

        const metadataFrom = await this.fromApi.rpc.state.getMetadata();
        const metadataTo = await this.toApi.rpc.state.getMetadata();

        if (!await checkAvailability(metadataFrom.asLatest.modules, metadataTo.asLatest.modules, storageItems)) {
            // TODO: Log error and abort
        }

        let from: Hash;
        if (flags["from-block"] == '-1') {
            const lastHdr = await this.fromApi.rpc.chain.getHeader();
            from = lastHdr.hash;
        } else {
            let bn = parseInt(flags['from-block']);
            if (bn !== undefined) {
                from = await this.fromApi.rpc.chain.getBlockHash(bn);
            } else {
                // TODO: Log error and abort
            }
        }

        let to: Hash;
        if (flags["to-block"] == '-1') {
            const lastHdr = await this.toApi.rpc.chain.getHeader();
            to = lastHdr.hash;
        } else {
            let bn = parseInt(flags['to-block']);
            if (bn !== undefined) {
                try {
                    to = await this.toApi.rpc.chain.getBlockHash(bn)
                } catch (err) {
                    // TODO: Log error and abort
                }
            } else {
                // TODO: Log error and abort
            }
        }

        try {
            let migrationData = await prepareMigrate(fromApi, toApi, storageItems, from, to);
            let sequence: Array<StorageElement> = await this.parseSequence(flags["sequence"], storageItems);
            let failed: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>> = new Array();

            let results = await migrate(toApi, executor, sequence, migrationData, (failedXts) => {
                failed.push(...failedXts);
                console.log("The following extrinsics failed during migration:");

                for (const xt of failedXts) {
                    console.log(xt.toHuman())
                }
            });

            // TODO: Log results
            fromApi.disconnect();
            toApi.disconnect();
        } catch (err) {
            // TODO: Log error and abort
        }
    }

    async parseSequence(inputSequence: string[],  storageItems: StorageElement[]): Promise<StorageElement[]> {
        let sequence = new Array();

        if (inputSequence !== undefined && inputSequence.length > 0) {
            for(let one of flags["sequence"]) {
                let element = parseModuleInput(one);

                // Need to remove element, as it is not mandatory to name
                // all elements in the sequence, the rest will be randomly
                // appended in the end.
                const index = storageItems.indexOf(element);
                if (index > -1) {
                    storageItems.splice(index, 1);
                } else {
                    // TODO: Log error and abort
                }

                sequence.push(element);
            }

            // Now append the remaining elements, if any are there
            for (let element of storageItems) {
                sequence.push(element);
            }

        } else {
            for (let element of storageItems) {
                sequence.push(element);
            }
        }

        return sequence;
    }

    async parseExecutor(filePath: string): Promise<KeyringPair> {
        let keyring = new Keyring();

        try {
            let file = fs.readFileSync(filePath);
            let executor = keyring.addFromJson(JSON.parse(file.toString()));

            let pwd;
            let isRead = false;
            await capturePwd(isRead, (password) => {
                pwd = password;
            });

            while (!isRead){
                // Loop till user input is read...
                await new Promise(r => setTimeout(r, 500));
            }
            executor.unlock(pwd);

            return executor;
        } catch (err) {
          // TODO: Log error and abort;
        }

        async function capturePwd(isRead: boolean, cb: (string) => void) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Please provide the password for JSON-account-file: ', function(password) {
                // @ts-ignore
                rl.output.write("\n");
                // @ts-ignore
                rl.history.slice(1);
                rl.close();
                isRead = true;
                cb(password);
            });
            // @ts-ignore
            rl._writeToOutput = function _writeToOutput(stringToWrite) {
                // @ts-ignore
                rl.output.write("*");
            };
        }
    }

}



export async function prepareMigrate(fromApi: ApiPromise, toApi: ApiPromise, storageItems: Array<StorageElement>, at: Hash, to: Hash): Promise<Map<string, Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>>> {
    let transformedData = Array.from(await transform(fromApi, toApi, storageItems, at, to));

    let migrationXts: Map<string, Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>> = new Map();

    // For every prefix do the correct transformation.
    for (let [prefix, keyValues] of transformedData) {
        // Match all prefixes we want to transform
        if (prefix.startsWith(xxhashAsHex("System", 128))) {
            let migratedPalletStorageItems = await prepareSystem(toApi, keyValues);
            migrationXts.set(prefix, migratedPalletStorageItems)

        } else if (prefix.startsWith(xxhashAsHex("Balances", 128))) {
            let migratedPalletStorageItems = await prepareBalances(toApi, keyValues);
            migrationXts.set(prefix, migratedPalletStorageItems)

        } else if (prefix.startsWith(xxhashAsHex("Vesting", 128))) {
            let migratedPalletStorageItems = await prepareVesting(toApi, keyValues);
            migrationXts.set(prefix, migratedPalletStorageItems)

        } else if (prefix.startsWith(xxhashAsHex("Proxy", 128))) {
            let migratedPalletStorageItems = await prepareProxy(toApi, keyValues);
            migrationXts.set(prefix, migratedPalletStorageItems)

        } else {
            console.log("Fetched data that can not be migrated. PatriciaKey is: " + prefix);
        }
    }

    return migrationXts;
}

export async function migrate(
    toApi: ApiPromise,
    executor: KeyringPair,
    sequence: Array<StorageElement>,
    data: Map<string, Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>>,
    cbErr: (failed: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) => void
) : Promise<Array<[Hash, bigint]>>
{
    const { nonce } = await toApi.query.system.account(executor.address);

    let dispatcher = new Dispatcher(toApi, executor, nonce.toBigInt(), cbErr, 10, 100);

    for (const one of sequence) {
        if (one instanceof PalletElement) {
            let palletData = data.get(one.palletHash);
            if (palletData !== undefined) {
                for(const [key, data] of Array.from(palletData)) {
                    await dispatcher.sudoDispatch(data);
                }
            } else {
                throw Error("Sequence element was NOT part of transformation. Pallet: " + one.pallet);
            }

        } else if (one instanceof StorageItemElement) {
            let storageItemData = data.get(one.palletHash)?.get(one.key)

            if (storageItemData !== undefined) {
                await dispatcher.sudoDispatch(storageItemData)
            } else {
                throw Error("Sequence element was NOT part of transformation. Pallet: " + one.pallet + ", Item: " + one.item);
            }
        } else {
            throw Error("Unreachable Code. qed.")
        }
    }

    return await dispatcher.getResults();
}


async function prepareSystem(toApi: ApiPromise, keyValues: Map<string, Array<StorageItem>>):  Promise<Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>> {
    let xts: Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> = new Map();

    // Match against the actual storage items of a pallet.
    for(let [palletStorageItemKey, values] of Array.from(keyValues)) {
        if (palletStorageItemKey === (xxhashAsHex("System", 128) + xxhashAsHex("Account", 128).slice(2))) {
            xts.set(palletStorageItemKey, await prepareSystemAccount(toApi, values));

        } else {
            console.log("Fetched data that can not be migrated. PatriciaKey is: " + palletStorageItemKey);
        }
    }

    return xts;
}

async function prepareProxy(toApi: ApiPromise, keyValues: Map<string, Array<StorageItem>>):  Promise<Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>> {
    let xts: Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> = new Map();

    // Match against the actual storage items of a pallet.
    for(let [palletStorageItemKey, values] of Array.from(keyValues)) {
        if (palletStorageItemKey === (xxhashAsHex("Proxy", 128) + xxhashAsHex("Proxies", 128).slice(2))) {
            xts.set(palletStorageItemKey, await prepareProxyProxies(toApi, values));

        } else {
            console.log("Fetched data that can not be migrated. PatriciaKey is: " + palletStorageItemKey);
        }
    }

    return xts;
}

async function prepareProxyProxies(toApi: ApiPromise, values: StorageItem[]): Promise<Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> {
    let xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>> = new Array();

    let packetOfProxies: Array<[AccountId, Balance, number[] | Uint8Array]> = new Array();

    // @ts-ignore
    const maxProxies = toApi.consts.migration.migrationMaxProxies.toNumber();

    let counter = 0;
    for (const item of values) {
        // We know from the transformation that optional is set here.
        // In this case it defines the actual amount that shall be reserved on the delegator
        counter += 1;
        if (item instanceof StorageMapValue) {
            if (packetOfProxies.length === maxProxies - 1  || counter === values.length) {
                // push the last element and prepare extrinsic
                let accountId = toApi.createType("AccountId", item.patriciaKey.slice(-32))
                // @ts-ignore
                let proxyInfo = toApi.createType('(Vec<ProxyDefinition<AccountId, ProxyType, BlockNumber>>, Balance)', item.value);

                //console.log("Inserting Proxy data: " + accountId.toHuman(), item.optional.toHuman(), proxyInfo.toHuman());
                packetOfProxies.push([accountId, item.optional, item.value])

                xts.push(toApi.tx.migration.migrateProxyProxies(packetOfProxies))
                packetOfProxies = new Array();

            } else {
                let accountId = toApi.createType("AccountId", item.patriciaKey.slice(-32))
                // @ts-ignore
                let proxyInfo = toApi.createType('(Vec<ProxyDefinition<AccountId, ProxyType, BlockNumber>>, Balance)', item.value);
                //console.log("Inserting Proxy data: " + accountId.toHuman(), item.optional.toHuman(), proxyInfo.toHuman());

                packetOfProxies.push([accountId, item.optional, item.value])
            }
        } else {
            throw Error("Expected Proxy.Proxies storage values to be of type StorageMapValue. Got: " + JSON.stringify(item));
        }
    }

    return xts;
}

async function prepareSystemAccount(toApi: ApiPromise, values: StorageItem[]): Promise<Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> {
    let xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>> = new Array();

    let packetOfAccounts: Array<[number[] | Uint8Array, number[] | Uint8Array]> = new Array();

    // @ts-ignore
    const maxAccounts = toApi.consts.migration.migrationMaxAccounts.toNumber();

    let counter = 0;
    for (const item of values) {
        counter += 1;
        if (item instanceof StorageMapValue) {
            if (packetOfAccounts.length === maxAccounts - 1  || counter === values.length) {
                // push the last element and prepare extrinsic
                packetOfAccounts.push(await retrieveIdAndAccount(item))
                xts.push(toApi.tx.migration.migrateSystemAccount(packetOfAccounts))

                packetOfAccounts = new Array();
            } else {
                packetOfAccounts.push(await retrieveIdAndAccount(item))
            }
        } else {
            throw Error("Expected System.Account storage values to be of type StorageMapValue. Got: " + JSON.stringify(item));
        }
    }

    return xts;
}


async function retrieveIdAndAccount(item: StorageMapValue): Promise<[number[] | Uint8Array, number[] | Uint8Array]> {
    const id = Array.from(item.patriciaKey.toU8a(true));
    const value = Array.from(item.value);

    return [id, value];
}

async function prepareBalances(toApi: ApiPromise, keyValues: Map<string, Array<StorageItem>>):  Promise<Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>> {
    let xts: Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> = new Map();

    for(let [palletStorageItemKey, values] of Array.from(keyValues)) {
        if (palletStorageItemKey === xxhashAsHex("Balances", 128) + xxhashAsHex("TotalIssuance", 128).slice(2)) {
            xts.set(palletStorageItemKey, await prepareBalancesTotalIssuance(toApi, values));
        } else {
            console.log("Fetched data that can not be migrated. PatriciaKey is: " + palletStorageItemKey);
        }
    }

    return xts;
}

async function prepareBalancesTotalIssuance(toApi: ApiPromise, values: StorageItem[]): Promise<Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> {
    let xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>> = new Array();

    if (values.length != 1) {
        throw Error("TotalIssuance MUST be single value. Got " + values.length);
    }

    for (const item of values) {
        if (item instanceof StorageValueValue) {
            const issuance = toApi.createType("Balance", item.value);
            xts.push(toApi.tx.migration.migrateBalancesIssuance(issuance))
        } else {
            throw Error("Expected Balances.TotalIssuance storage value to be of type StorageValueValue. Got: " + JSON.stringify(item));
        }
    }

    return xts;
}

async function prepareVesting(toApi: ApiPromise, keyValues: Map<string, Array<StorageItem>>):  Promise<Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>> {
    let xts: Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> = new Map();

    for(let [palletStorageItemKey, values] of Array.from(keyValues)) {
        if (palletStorageItemKey === xxhashAsHex("Vesting", 128) + xxhashAsHex("Vesting", 128).slice(2)) {
            xts.set(palletStorageItemKey, await prepareVestingVestingInfo(toApi, values));

        } else {
            console.log("Fetched data that can not be migrated. PatriciaKey is: " + palletStorageItemKey);
        }
    }

    return xts;
}

async function prepareVestingVestingInfo(toApi: ApiPromise, values: StorageItem[]): Promise<Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> {
    let xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>> = new Array();

    let packetOfVestings: Array<[AccountId, VestingInfo]> = new Array();

    // @ts-ignore
    const maxVestings = toApi.consts.migration.migrationMaxVestings.toNumber();
    let counter = 0;

    for (const item of values) {
        counter += 1;
        if (item instanceof StorageMapValue) {
            let vestingInfo = toApi.createType("VestingInfo", item.value);
            let accountId = toApi.createType("AccountId", item.patriciaKey.slice(-32))

            if (packetOfVestings.length === maxVestings - 1  || counter === values.length){
                // push the last element and prepare extrinsic
                packetOfVestings.push([accountId, vestingInfo])
                xts.push(toApi.tx.migration.migrateVestingVesting(packetOfVestings))

                packetOfVestings = new Array();
            } else {
                packetOfVestings.push([accountId, vestingInfo])
            }
        } else {
            throw Error("Expected Vesting.Vesting storage value to be of type StorageMapValue. Got: " + JSON.stringify(item));
        }
    }

    return xts;
}


export async function test_run() {
    const wsProviderFrom = new WsProvider("wss://fullnode-archive.centrifuge.io");
    const fromApi = await ApiPromise.create({
        provider: wsProviderFrom,
        types: {
            ProxyType: {
                _enum: ['Any', 'NonTransfer', 'Governance', 'Staking', 'Vesting']
            }
        }
    });

    const wsProviderTo = new WsProvider("ws://127.0.0.1:9946");
    //const wsProviderTo = new WsProvider("wss://fullnode-collator.charcoal.centrifuge.io");
    const toApi = await ApiPromise.create({
        provider: wsProviderTo,
        types: {
            ProxyType: {
                _enum: ['Any', 'NonTransfer', 'Governance', '_Staking', 'NonProxy']
            }
        }
    });

    let storageItems = new Array();
    storageItems.push(...getDefaultStorage());

    const metadataFrom = await fromApi.rpc.state.getMetadata();
    const metadataTo = await fromApi.rpc.state.getMetadata();


    const lastFromHdr = await fromApi.rpc.chain.getHeader();
    let at = lastFromHdr.hash;
    const lastToHdr = await toApi.rpc.chain.getHeader();
    let to = lastToHdr.hash;

    let migrationData = await prepareMigrate(fromApi, toApi, storageItems, at, to);

    let sequence: Array<StorageElement> = storageItems;

    const keyring = new Keyring({type: 'sr25519'});
    let alice = keyring.addFromUri('//Alice');
    let failed: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>> = new Array();

    let results = await migrate(toApi, alice, sequence, migrationData, (failedXts) => {
        failed.push(...failedXts);
        console.log("The following extrinsics failed");

        for (const xt of failedXts) {
            console.log(xt.toJSON())
        }
    });

    fromApi.disconnect();
    toApi.disconnect();
}