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
        }),
        'verify': flags.boolean({
            description: 'Verifies the migration after running it.',
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

            if (flags["verify"]) {
                // We need the latest block, as we want the "current" state
                //
                // Note: This might break verification, if other actors can change the state between the migration and
                //       this block.
                const lastHdr = await this.toApi.rpc.chain.getHeader();
                const newTo = lastHdr.hash;
                let failedPairs = await verifyMigration(toApi, fromApi, storageItems, newTo, from);

                if (failedPairs.length !== 0) {
                    console.log("The following pairs failed to be verified: ");
                    console.log(failedPairs);
                }
            }

            console.log("Logging extrinsic block hashes and indexes of the migration: ");
            console.log(results);

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

export async function verifyMigration(toApi: ApiPromise, fromApi: ApiPromise, storageItems: Array<StorageElement>, atTo: Hash, atFrom: Hash): Promise<Array<[StorageKey, number[] | Uint8Array]>> {
    let forkDataOld = await fork(fromApi, storageItems, atFrom);
    let forkDataNew = await fork(toApi, storageItems, atTo);

    let fromAsNum = (await fromApi.rpc.chain.getBlock(atFrom)).block.header.number.toBigInt();
    let toAsNum = (await toApi.rpc.chain.getBlock(atTo)).block.header.number.toBigInt();

    let failedAcc = new Array();

    // create a good counter
    let itemsToCheck = 0;
    for (const [_one, data] of Array.from(forkDataOld)) {
        itemsToCheck += data.length;
    }
    console.log("Starting verification of " + itemsToCheck + " migrated storage keys.");

    process.stdout.write("    Verifying:    0/" + itemsToCheck + "\r");
    for (const [key, oldData ] of Array.from(forkDataOld)) {

        let newData = forkDataNew.get(key);

        if (oldData === undefined){
            failedAcc.push(...oldData);
            console.log("Some data from old could not be found in the new data...");
        } else {
            if (key === xxhashAsHex("System", 128) + xxhashAsHex("Account", 128).slice(2)) {
                let failed = await verifySystemAccount(oldData, fromApi, newData, toApi);
                if(failed.length === 0) {
                    failedAcc.push(...failed);
                }
            } else if (key === xxhashAsHex("Balances", 128) + xxhashAsHex("TotalIssuance", 128).slice(2)){
                let failed = await verifyBalanceTotalIssuance(oldData, fromApi, newData, toApi);
                if(failed.length === 0) {
                    failedAcc.push(...failed);
                }
            } else if (key === xxhashAsHex("Vesting", 128) + xxhashAsHex("Vesting", 128).slice(2)){
                let failed = await verifyVestingVesting(oldData, fromApi, newData, toApi, fromAsNum, toAsNum);
                if(failed.length === 0) {
                    failedAcc.push(...failed);
                }
            } else if (key === xxhashAsHex("Proxy", 128) + xxhashAsHex("Proxies", 128).slice(2)){
                let failed = await verifyProxyProxies(oldData, fromApi, newData, toApi);
                if(failed.length === 0) {
                    failedAcc.push(...failed);
                }
            } else {
                failedAcc.push(...oldData);
                console.log("Some data from old could not be verified here...");
            }
        }
    }

    return failedAcc;
}

async function verifySystemAccount(oldData: Array<[StorageKey, number[] | Uint8Array]>, oldApi: ApiPromise, newData: Array<[StorageKey, number[] | Uint8Array]>, newApi: ApiPromise): Promise<Array<[StorageKey, number[] | Uint8Array]>> {
    let failed = new Array();

    let newDataMap = newData.reduce(function (map, obj) {
        map[obj[0].toHex()] = obj[1];
        return map;
    }, new Map());

    let checked = 0;
    for(let [key, value] of oldData) {
        process.stdout.write("    Verifying:    "+ checked +"/ \r");

        let oldAccount = oldApi.createType('AccountInfo', value);

        let newScale = newDataMap.get(key.toHex());
        if (newScale !== undefined) {
            let newAccount = oldApi.createType('AccountInfo', newScale.get(key.toHex()[1]))

            if (oldAccount.data.free.toBigInt() + oldAccount.data.reserved.toBigInt() !== newAccount.data.free.toBigInt()) {
                failed.push([key, value]);
            }

        } else {
            failed.push([key, value]);
        }

        checked += 1;
    }

    return failed;
}

async function verifyBalanceTotalIssuance(oldData: Array<[StorageKey, number[] | Uint8Array]>, oldApi: ApiPromise, newData: Array<[StorageKey, number[] | Uint8Array]>, newApi: ApiPromise): Promise<Array<[StorageKey, number[] | Uint8Array]>> {
    let failed = new Array();

    let newDataMap = newData.reduce(function (map, obj) {
        map[obj[0].toHex()] = obj[1];
        return map;
    }, new Map());

    let checked = 0;
    for(let [key, value] of oldData) {
        process.stdout.write("    Verifying:    "+ checked +"/ \r");

        let oldIssuance = oldApi.createType('Balance', value);

        let newScale = newDataMap.get(key.toHex());
        if (newScale !== undefined) {
            let newIssuance = oldApi.createType('Balance', newScale.get(key.toHex()[1]))

            if (oldIssuance.toBigInt() > newIssuance.toBigInt()) {
                failed.push([key, value]);
            }

        } else {
            failed.push([key, value]);
        }

        checked += 1;
    }

    return failed;
}

async function verifyProxyProxies(oldData: Array<[StorageKey, number[] | Uint8Array]>, oldApi: ApiPromise, newData: Array<[StorageKey, number[] | Uint8Array]>, newApi: ApiPromise): Promise<Array<[StorageKey, number[] | Uint8Array]>> {
    let failed = new Array();

    let newDataMap = newData.reduce(function (map, obj) {
        map[obj[0].toHex()] = obj[1];
        return map;
    }, new Map());

    let checked = 0;
    for(let [key, value] of oldData) {
        process.stdout.write("    Verifying:    "+ checked +"/ \r");

        // @ts-ignore
        let oldProxyInfo = oldApi.createType('(Vec<(AccountId, ProxyType)>, Balance)', value);

        let newScale = newDataMap.get(key.toHex());
        if (newScale !== undefined) {
            // @ts-ignore
            let newProxyInfo = newApi.createType('(Vec<ProxyDefinition<AccountId, ProxyType, BlockNumber>>, Balance)', newScale.get(key.toHex()[1]));

            if (oldProxyInfo[0][0].length === newProxyInfo[0][0].length
                && oldProxyInfo[0][1].toBigInt() === newProxyInfo[0][1].toBigInt()
                && oldProxyInfo[0][0][1].toBigInt() === newProxyInfo[0][0]["proxyType"].toBigInt()
            ) {
                // Now also check each delegate of this proxy entry
                for(const oldDelegate of oldProxyInfo[0][0]) {
                    let found = false;
                    let oldAccount = oldDelegate[0].toHex();

                    for (const newDelegate of newProxyInfo[0][0]) {
                        let newAccount = newDelegate["delegate"].toHex();
                        if (oldAccount === newAccount) {
                            found = true;
                        }
                    }

                    if (!found){
                        failed.push([key, value]);
                    }
                }
            } else {
                failed.push([key, value]);
            }
        } else {
            failed.push([key, value]);
        }

        checked += 1;
    }

    return failed;
}

async function verifyVestingVesting(oldData: Array<[StorageKey, number[] | Uint8Array]>, oldApi: ApiPromise, newData: Array<[StorageKey, number[] | Uint8Array]>, newApi: ApiPromise, atFrom: bigint, atTo: bigint): Promise<Array<[StorageKey, number[] | Uint8Array]>> {
    let failed = new Array();

    let newDataMap = newData.reduce(function (map, obj) {
        map[obj[0].toHex()] = obj[1];
        return map;
    }, new Map());

    let checked = 0;
    for(let [key, value] of oldData) {
        process.stdout.write("    Verifying:    "+ checked +"/ \r");

        // Ensure existance of this account
        const { data: oldBalance } = await oldApi.query.system.account(key.toU8a(true).slice(-32));
        const { data: newBalance } = await newApi.query.system.account(key.toU8a(true).slice(-32));

        let overallOld = oldBalance.free.toBigInt() + oldBalance.reserved.toBigInt();
        let overallNew = newBalance.free.toBigInt() + newBalance.reserved.toBigInt();

        if (overallNew !== overallNew) {
            failed.push([key, value]);
            continue;
        }

        let oldVestingInfo = oldApi.createType('VestingInfo', value);

        const blockPeriodOldVesting = (oldVestingInfo.locked.toBigInt() / oldVestingInfo.perBlock.toBigInt());
        const blocksPassedSinceVestingStart = (atFrom - oldVestingInfo.startingBlock.toBigInt());
        const remainingBlocksVestingOld = blockPeriodOldVesting - blocksPassedSinceVestingStart;

        if (oldVestingInfo.startingBlock.toBigInt() - atFrom >= 0) {
            // Vesting has passed, the chain will resolve this directly upon our inserts.
        } else {
            let newScale = newDataMap.get(key.toHex());
            if (newScale !== undefined) {
                let newVestingInfo = oldApi.createType('VestingInfo', newScale.get(key.toHex()[1]))

                const blockPeriodNewVesting = newVestingInfo.locked.toBigInt() / newVestingInfo.perBlock.toBigInt();
                const blocksPassedSinceVestingStartNew = (atTo - newVestingInfo.startingBlock.toBigInt());
                const remainingBlocksVestingNew = blockPeriodNewVesting - blocksPassedSinceVestingStartNew;

                if (remainingBlocksVestingOld !== (remainingBlocksVestingNew * BigInt(2))) {
                     failed.push([key, value]);
                }

            } else {
                failed.push([key, value]);
            }
        }

        checked += 1;
    }

    return failed;
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
                let accountId = toApi.createType("AccountId", item.patriciaKey.toU8a(true).slice(-32))
                // @ts-ignore
                let proxyInfo = toApi.createType('(Vec<ProxyDefinition<AccountId, ProxyType, BlockNumber>>, Balance)', item.value);

                //console.log("Inserting Proxy data: " + accountId.toHuman(), item.optional.toHuman(), proxyInfo.toHuman());
                packetOfProxies.push([accountId, item.optional, item.value])

                xts.push(toApi.tx.migration.migrateProxyProxies(packetOfProxies))
                packetOfProxies = new Array();

            } else {
                let accountId = toApi.createType("AccountId", item.patriciaKey.toU8a(true).slice(-32))
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
            let accountId = toApi.createType("AccountId", item.patriciaKey.toU8a(true).slice(-32))

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
    //let at = lastFromHdr.hash;
    let at = await  fromApi.rpc.chain.getBlockHash(6650475);

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

    const lastHdr = await toApi.rpc.chain.getHeader();
    const newTo = lastHdr.hash;
    let verification = await verifyMigration(toApi, fromApi, storageItems, newTo, at);

    if(verification.length === 0) {
        console.log("Migration was successful.");
    } else {
        console.log("Some failed. Data comes here: ")

        for (let failed of verification) {
            console.log(JSON.stringify(failed));
        }
    }

    fromApi.disconnect();
    toApi.disconnect();
}