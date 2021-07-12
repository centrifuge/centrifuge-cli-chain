// Here comes the oclif specific stuff
import Command, {flags} from '@oclif/command'
import {ApiPromise, Keyring, SubmittableResult, WsProvider} from "@polkadot/api";
import { xxhashAsHex} from "@polkadot/util-crypto";
import {AccountId, Balance, Hash, VestingInfo} from "@polkadot/types/interfaces";

import {DefaultStorage, Dispatcher, insertOrNewMap, toByteArray, toHexString} from "../common/common";
import {StorageItem, transform, StorageValueValue, StorageMapValue, StorageDoubleMapValue} from "../transform/transform";
import {ApiTypes, SubmittableExtrinsic} from "@polkadot/api/types";
import {KeyringPair} from "@polkadot/keyring/types";
import {bool, StorageKey} from "@polkadot/types";

export default class MigrateCommand extends Command {
    fromApi: ApiPromise;
    toApi: ApiPromise;

    static description = 'fork the state of an existing substrate based chain';

    static flags = {
        'source-network': flags.string({
            char: 's',
            description: 'the networks ws-endpoint the state shall be forked from',
        }),
        'destination-network': flags.string({
            char: 'd',
            description: 'the networks ws-endpoint the state shall be ported to',
        }),
        'at-block': flags.string({
            char: 'b',
            description: 'specify at which block to take the state from the chain. Input must be a hash.',
            default: '-1',
        }),
        'output': flags.boolean({
            char: 'o'
        }),
        'modules': flags.string({
            char: 'm',
            multiple: true,

        }),
        'no-default': flags.boolean({
            description: 'Do not fork the default modules. Namely: System, Balances',
        }),
        'full-chain': flags.boolean({
            description: 'Fork all modules storages',
            exclusive: ['no-default', 'modules'],
        })
    };

    async run() {
        const {flags} = this.parse(MigrateCommand);

        const wsProviderFrom = new WsProvider(flags["source-network"]);
        const fromApi = await ApiPromise.create({
            provider: wsProviderFrom
        });

        const wsProviderTo = new WsProvider(flags["destination-network"]);
        const toApi = await ApiPromise.create({
            provider: wsProviderTo
        });

        this.fromApi = fromApi;
        this.toApi = toApi

        let storageItems = flags["modules"];

        // Transfrom modules into correct hashes
        storageItems.forEach((item) => {

        });

        if (!flags["no-default"]) {
            storageItems.push(...DefaultStorage);
        }

        const metadata = await this.fromApi.rpc.state.getMetadata();
        const modules = metadata.asLatest.modules;

        // Check if module is available
        // Iteration is death, but we do not care here...
        for (let key of storageItems) {
            let available = false;
            metadata.asLatest.modules.forEach((module) => {
                if (module.storage.isSome) {
                    if (key.startsWith(xxhashAsHex(module.storage.unwrap().prefix.toString(), 128))) {
                        available = true
                    }
                }
            });

            if (!available) {
                console.log("Storage with key " + key +" is not available")
                storageItems.filter((val) => key != val)
            }
        }


        let at: Hash;

        if (flags["at-block"] == '-1') {
            const lastHdr = await this.fromApi.rpc.chain.getHeader();
            at = lastHdr.hash;
        } else {
            at = this.fromApi.createType("Hash", flags["at-block"]);
        }

        //let migrationData = await prepareMigrate(this.fromApi, this.toApi, storageItems, at, at) // TODO: Add actual to from parachain
         //   .catch((err) => console.log(err)); // TODO: Do something usefull with error and abort.



        if (flags["output"]) {
            // TODO: Write stuff to a file here, correctly as a json
            //       * define json format
        }
    }
}

export async function prepareMigrate(fromApi: ApiPromise, toApi: ApiPromise, storageItems: Array<StorageKey>, at: Hash, to: Hash): Promise<Map<string, Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>>> {
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
    sequence: Array<SequenceElement>,
    data: Map<string, Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>>,
    cbErr: (failed: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) => void
) : Promise<Array<[Hash, bigint]>>
{
    const { nonce } = await toApi.query.system.account(executor.address);

    let dispatcher = new Dispatcher(toApi, executor, nonce.toBigInt(), cbErr, 10, 100);

    for (const one of sequence) {
        if (one instanceof OneLevelSequenceElement) {
            let palletData = data.get(one.pallet)
            if (palletData !== undefined) {
                for(const [key, data] of Array.from(palletData)) {
                    await dispatcher.sudoDispatch(data);
                }
            } else {
                throw Error("Sequence element was NOT part of transformation.");
            }
        } else if (one instanceof TwoLevelSequenceElement) {
            let storageItemDataMap = data.get(one.pallet)
            let storageItemData = storageItemDataMap.get(one.getStorageKey());
            if (storageItemData !== undefined) {
                await dispatcher.sudoDispatch(storageItemData)
            } else {
                //throw Error("Sequence element was NOT part of transformation.");
            }
        } else {
            throw Error("Unimplemented Sequence. No migration happening.")
        }
    }

    console.log("Awaiting results now...")
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
                console.log("Inserting Proxy data: " + accountId.toHuman(), item.optional.toHuman(), proxyInfo.toHuman());
                packetOfProxies.push([accountId, item.optional, item.value])

                xts.push(toApi.tx.migration.migrateProxyProxies(packetOfProxies))
                packetOfProxies = new Array();

            } else {
                let accountId = toApi.createType("AccountId", item.patriciaKey.slice(-32))
                // @ts-ignore
                let proxyInfo = toApi.createType('(Vec<ProxyDefinition<AccountId, ProxyType, BlockNumber>>, Balance)', item.value);
                console.log("Inserting Proxy data: " + accountId.toHuman(), item.optional.toHuman(), proxyInfo.toHuman());

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


    let storageItems: Array<string> = [
        xxhashAsHex('Vesting', 128) + xxhashAsHex("Vesting", 128).slice(2),
        xxhashAsHex('Proxy', 128) + xxhashAsHex("Proxies", 128).slice(2)
    ];

    storageItems.push(...DefaultStorage);

    const metadataFrom = await fromApi.rpc.state.getMetadata();
    const metadataTo = await fromApi.rpc.state.getMetadata();

    // Check if module is available
    // Iteration is death, but we do not care here...
    for (let key of storageItems) {
        let availableFrom = false;
        let availableTo = false;

        metadataFrom.asLatest.modules.forEach((module) => {
            if (module.storage.isSome) {
                if (key.startsWith(xxhashAsHex(module.storage.unwrap().prefix.toString(), 128))) {
                    availableFrom = true
                }
            }
        });

        metadataTo.asLatest.modules.forEach((module) => {
            if (module.storage.isSome) {
                if (key.startsWith(xxhashAsHex(module.storage.unwrap().prefix.toString(), 128))) {
                    availableTo = true
                }
            }
        });

        if (!availableFrom || !availableTo) {
            console.log("Storage with key " + key +" is not available")
            storageItems.filter((val) => key != val)
        }
    }


    const lastHdr = await fromApi.rpc.chain.getHeader();
    let at = lastHdr.hash;

    let keyItems = [];

    for (const stringKey of storageItems) {
        keyItems.push(fromApi.createType("StorageKey", stringKey));
    }

    let migrationData = await prepareMigrate(fromApi, toApi, keyItems, at, at); // TODO: Add actual to hash from parachain

    let sequence: Array<SequenceElement> = new Array();
    sequence.push(new TwoLevelSequenceElement(xxhashAsHex("Balances", 128),  xxhashAsHex("TotalIssuance", 128)));
    sequence.push(new TwoLevelSequenceElement( xxhashAsHex("System", 128),  xxhashAsHex("Account", 128)));
    sequence.push(new TwoLevelSequenceElement( xxhashAsHex("Vesting", 128),  xxhashAsHex("Vesting", 128)));
    sequence.push(new TwoLevelSequenceElement( xxhashAsHex("Proxy", 128),  xxhashAsHex("Proxies", 128)));

    const keyring = new Keyring({ type: 'sr25519'});
    let alice = keyring.addFromUri('//Alice');
    let failed: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>> = new Array();

    let results = await migrate(toApi, alice, sequence, migrationData, (failedXts) => {
        failed.push(...failedXts);
        console.log("The following extrinsics failed");

        for (const xt of failedXts) {
            console.log(xt.toJSON())
        }
    });

    console.log(results);

    fromApi.disconnect();
    toApi.disconnect();
}

// Abstract migration element and then whole pallet or just item.

abstract class SequenceElement {
    readonly inSequence: boolean;
    readonly isPallet: boolean
    abstract getStorageKey(): string;

    constructor(inSequence: boolean, isPallet: boolean) {
        this.inSequence = inSequence;
        this.isPallet = isPallet;
    }
}

class OneLevelSequenceElement extends SequenceElement {
    readonly pallet: string;

    constructor(pallet: string, inSequence: boolean = false) {
        super(inSequence, true);

        this.pallet = pallet;
    }

    getStorageKey(): string {
        return (this.pallet);
    }
}

class TwoLevelSequenceElement extends SequenceElement{
    readonly pallet: string;
    readonly storageItem: string;

    constructor(pallet: string, storageItem: string, inSequence: boolean = false) {
        super(inSequence, false);
        this.pallet = pallet;
        this.storageItem = storageItem;
    }

    getStorageKey(): string {
        return ( this.pallet + this.storageItem.slice(2));
    }
}
