// Here comes the oclif specific stuff
import Command, {flags} from '@oclif/command'
import {ApiPromise, SubmittableResult, WsProvider} from "@polkadot/api";
import { xxhashAsHex} from "@polkadot/util-crypto";
import {Hash, VestingInfo} from "@polkadot/types/interfaces";

import {DefaultStorage, insertOrNewMap, toByteArray, toHexString} from "../common/common";
import {StorageItem, transform, StorageValueValue, StorageMapValue, StorageDoubleMapValue} from "../transform/transform";
import {ApiTypes, SubmittableExtrinsic} from "@polkadot/api/types";

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

        let migrationData = await prepareMigrate(this.fromApi, this.toApi, storageItems, at)
            .catch((err) => console.log(err)); // TODO: Do something usefull with error and abort.



        if (flags["output"]) {
            // TODO: Write stuff to a file here, correctly as a json
            //       * define json format
        }
    }
}

export async function prepareMigrate(fromApi: ApiPromise, toApi: ApiPromise, storageItems: Array<string>, at: Hash): Promise<Map<string, Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>>> {
    let transformedData = Array.from(await transform(fromApi, toApi, storageItems, at));

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

        } else {
            console.log("Fetched data that can not be migrated. PatriciaKey is: " + prefix);
        }
    }

    return migrationXts;
}


async function prepareSystem(toApi: ApiPromise, keyValues: Map<string, Array<StorageItem>>):  Promise<Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>> {
    let xts: Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> = new Map();

    // Match against the actual storage items of a pallet.
    for(let [palletStorageItemKey, values] of Array.from(keyValues)) {
        if (palletStorageItemKey === (xxhashAsHex("System", 128) + xxhashAsHex("Account", 128).slice(2))) {
            xts.set(palletStorageItemKey, await transformSystemAccount(toApi, values));

        } else {
            console.log("Fetched data that can not be migrated. PatriciaKey is: " + palletStorageItemKey);
        }
    }

    return xts;
}



async function transformSystemAccount(toApi: ApiPromise, values: StorageItem[]): Promise<Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> {
    let xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>> = new Array();

    let packetOfAccounts: Array<[number[] | Uint8Array, number[] | Uint8Array]> = new Array();

    // @ts-ignore
    const maxAccounts = toApi.consts.migration.maxAccounts.toNumber();

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
    const id = Array.from(item.patriciaKey);
    const value = Array.from(item.value);

    return [id, value];
}

async function prepareBalances(toApi: ApiPromise, keyValues: Map<string, Array<StorageItem>>):  Promise<Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>>> {
    let xts: Map<string, Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> = new Map();

    for(let [palletStorageItemKey, values] of Array.from(keyValues)) {
        if (palletStorageItemKey === xxhashAsHex("Balances", 128) + xxhashAsHex("TotalIssuance", 128).slice(2)) {
            xts.set(palletStorageItemKey, await transformBalancesTotalIssuance(toApi, values));
        } else {
            console.log("Fetched data that can not be migrated. PatriciaKey is: " + palletStorageItemKey);
        }
    }

    return xts;
}

async function transformBalancesTotalIssuance(toApi: ApiPromise, values: StorageItem[]): Promise<Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> {
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
            xts.set(palletStorageItemKey, await transformVestingVestingInfo(toApi, values));

        } else {
            console.log("Fetched data that can not be migrated. PatriciaKey is: " + palletStorageItemKey);
        }
    }

    return xts;
}

async function transformVestingVestingInfo(toApi: ApiPromise, values: StorageItem[]): Promise<Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>> {
    let xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>> = new Array();

    let packetOfVestings: Array<VestingInfo> = new Array();

    // @ts-ignore
    const maxVestings = toApi.consts.migration.maxVestings.toNumber();
    let counter = 0;

    for (const item of values) {
        counter += 1;
        if (item instanceof StorageMapValue) {
            let vestingInfo = toApi.createType("VestingInfo", item.value);

            if (packetOfVestings.length === maxVestings - 1  || counter === values.length){
                // push the last element and prepare extrinsic
                packetOfVestings.push(vestingInfo)
                xts.push(toApi.tx.migration.migrateVestingVesting(packetOfVestings))

                packetOfVestings = new Array();
            } else {
                packetOfVestings.push(vestingInfo)
            }
        } else {
            throw Error("Expected Vesting.Vesting storage value to be of type StorageMapValue. Got: " + JSON.stringify(item));
        }
    }

    return xts;
}



export async function test_run() {
    const wsProviderFrom = new WsProvider("wss://fullnode.amber.centrifuge.io");
    const fromApi = await ApiPromise.create({
        provider: wsProviderFrom
    });

    const wsProviderTo = new WsProvider("wss://fullnode-collator.charcoal.centrifuge.io");
    const toApi = await ApiPromise.create({
        provider: wsProviderTo
    });


    let storageItems: Array<string> = [
        xxhashAsHex('Vesting', 128)
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

    let migrationData = await prepareMigrate(fromApi, toApi, storageItems, at);

    fromApi.disconnect();
    toApi.disconnect();
}