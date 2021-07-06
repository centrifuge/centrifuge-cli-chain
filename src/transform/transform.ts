// Here comes the oclif specific stuff
import Command, {flags} from '@oclif/command'
import {ApiPromise, WsProvider} from "@polkadot/api";
import { xxhashAsHex } from "@polkadot/util-crypto";
import { Hash } from "@polkadot/types/interfaces";

import { fork } from "../fork/fork";
import {toHexString, DefaultStorage, insertOrNewMap} from "../common/common";
import {prepareMigrate} from "../migrate/migrate";

export default class TransformCommand extends Command {
    fromApi: ApiPromise;
    toApi: ApiPromise;

    static description = 'transform the centrifuge state from mainnet to a parachain compatible state';

    static flags = {
        'source-network': flags.string({
            char: 's',
            description: 'the networks ws-endpoint the state shall be forked from',
            default: 'wss://portal.chain.centrifuge.io',
        }),
        'destination-network': flags.string({
            char: 'd',
            description: 'the networks ws-endpoint the state shall be ported to',
            default: 'wss://portal.chain.centrifuge.io',
        }),
        'at-block': flags.string({
            char: 'b',
            description: 'specify at which block to take the state from the chain. Input must be a hash.',
            default: '-1',
        }),
        'as-genesis': flags.boolean({
            char: 'g'
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
        const {flags} = this.parse(TransformCommand);

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

        try {
            let state = await transform(this.fromApi, this.toApi, storageItems, at);
        } catch (err) {
            // TODO: Do something with the error
        }


        if (flags["as-genesis"]) {
            // TODO: Here the stuff to
            //       * create specs for forked chain
            //       * output spec somewhere
        }

        if (flags["output"]) {
            // TODO: Write stuff to a file here, correctly as a json
            //       * define json format
        }
    }
}

export async function transform(fromApi: ApiPromise, toApi: ApiPromise,  storageItems: Array<string>, at: Hash): Promise<Map<string, Map<string, Array<StorageItem>>>>   {
    let forkData = Array.from(await fork(fromApi, storageItems, at));

    let state: Map<string, Map<string, Array<StorageItem>>> = new Map();

    // For every prefix do the correct transformation.
    for (let [prefix, keyValues] of forkData) {
        // Match all prefixes we want to transform
        if (prefix.startsWith(xxhashAsHex("System",128))) {
             let migratedPalletStorageItems = await transformSystem(fromApi, toApi, keyValues);
             state.set(prefix, migratedPalletStorageItems)

        } else if (prefix.startsWith(xxhashAsHex("Balances", 128))) {
            let migratedPalletStorageItems = await transformBalances(fromApi, toApi, keyValues);
            state.set(prefix, migratedPalletStorageItems)

        } else if (prefix.startsWith(xxhashAsHex("Vesting", 128))) {
            let migratedPalletStorageItems = await transformVesting(fromApi, toApi, keyValues, at);
            state.set(prefix, migratedPalletStorageItems)

        } else {
            console.log("Fetched data that can not be transformed. PatriciaKey is: " + prefix);
        }
    }

    return state;
}

async function transformSystem(fromApi: ApiPromise, toApi: ApiPromise, keyValues: Array<[Uint8Array | number[], Uint8Array | number[]]>):  Promise<Map<string, Array<StorageItem>>> {
    let state: Map<string, Array<StorageItem>> = new Map();

    // Match against the actual storage items of a pallet.
    for(let [patriciaKey, value] of keyValues) {
        let hex: string = '0x' + await toHexString(patriciaKey);
        let systemAccount = xxhashAsHex("System", 128) + xxhashAsHex("Account", 128).slice(2);
        if (hex.startsWith(systemAccount)) {
            let pkStorageItem = xxhashAsHex("System", 128) + xxhashAsHex("Account", 128).slice(2);
            await insertOrNewMap(state, pkStorageItem, await transformSystemAccount(fromApi, toApi, patriciaKey, value));
        } else {
            console.log("Fetched data that can not be transformed. PatriciaKey is: " + hex);
        }
    }

    return state;
}



async function transformSystemAccount(fromApi: ApiPromise, toApi: ApiPromise, completeKey: number[] | Uint8Array, scaleOldAccountInfo: number[] | Uint8Array): Promise<StorageItem> {
    let oldAccountInfo = fromApi.createType("AccountInfo", scaleOldAccountInfo);
    let newAccountInfo = await toApi.createType("AccountInfo", [
        0, // nonce
        0, // consumers
        1, // provider
        0, // sufficients
        [
            oldAccountInfo.data.free.toBigInt() + oldAccountInfo.data.reserved.toBigInt(), // free balance
            0, // reserved balance
            0, // misc frozen balance
            0  // free frozen balance
        ]
    ]);

    if (oldAccountInfo.data.free.toBigInt() + oldAccountInfo.data.reserved.toBigInt()  !== newAccountInfo.data.free.toBigInt()) {
        let old = oldAccountInfo.data.free.toBigInt() + oldAccountInfo.data.reserved.toBigInt();
        throw new Error("Transformation failed. AccountData Balances. (Left: " + old + " vs. " + "Right: " + newAccountInfo.data.free.toBigInt());
    }

    return new StorageMapValue(newAccountInfo.toU8a(true), completeKey);
}

async function transformBalances(fromApi: ApiPromise, toApi: ApiPromise, keyValues: Array<[number[] | Uint8Array, number[] | Uint8Array]>):  Promise<Map<string, Array<StorageItem>>>{
    let state: Map<string, Array<StorageItem>> = new Map();

    for(let [patriciaKey, value] of keyValues) {
        let hex: string = '0x' + await toHexString(patriciaKey);
        if (hex.startsWith(xxhashAsHex("Balances", 128) + xxhashAsHex("TotalIssuance", 128).slice(2))) {
            let pkStorageItem = xxhashAsHex("Balances", 128) + xxhashAsHex("TotalIssuance", 128).slice(2);
            await insertOrNewMap(state, pkStorageItem, await transformBalancesTotalIssuance(fromApi, toApi, patriciaKey, value));
        } else {
            console.log("Fetched data that can not be transformed. PatriciaKey is: " + hex);
        }
    }

    return state;
}

async function transformBalancesTotalIssuance(fromApi: ApiPromise, toApi: ApiPromise, completeKey: number[] | Uint8Array, scaleOldTotalIssuance: number[] | Uint8Array): Promise<StorageItem> {
    let oldIssuance = fromApi.createType("Balance", scaleOldTotalIssuance);
    let newIssuance = toApi.createType("Balance", oldIssuance.toU8a(true));

    if (oldIssuance.toBigInt() !== newIssuance.toBigInt()) {
        throw new Error("Transformation failed. TotalIssuance. (Left: " + oldIssuance.toJSON() + " vs. " + "Right: " + newIssuance.toJSON());
    }

    return new StorageValueValue(newIssuance.toU8a(true));
}

async function transformVesting(fromApi: ApiPromise, toApi: ApiPromise, keyValues: Array<[number[] | Uint8Array, number[] | Uint8Array]>, at: Hash):  Promise<Map<string, Array<StorageItem>>> {
    let state: Map<string, Array<StorageItem>> = new Map();
    const atAsNumber = (await fromApi.rpc.chain.getBlock(at)).block.header.number.toBigInt();


    for(let [patriciaKey, value] of keyValues) {
        let hex: string = '0x' + await toHexString(patriciaKey);
        if (hex.startsWith(xxhashAsHex("Vesting", 128) + xxhashAsHex("Vesting", 128).slice(2))) {
            let pkStorageItem = xxhashAsHex("Vesting", 128) + xxhashAsHex("Vesting", 128).slice(2);
            await insertOrNewMap(state, pkStorageItem, await transformVestingVestingInfo(fromApi, toApi, patriciaKey, value, atAsNumber));

        } else {
            console.log("Fetched data that can not be transformed. PatriciaKey is: " + hex);
        }
    }

    return state;
}

async function transformVestingVestingInfo(fromApi: ApiPromise, toApi: ApiPromise, completeKey: number[] | Uint8Array, scaleOldVestingInfo: number[] | Uint8Array, at: bigint): Promise<StorageItem> {
    let old = fromApi.createType("VestingInfo", scaleOldVestingInfo);

    let remainingLocked;
    let newPerBlock;
    let newStartingBlock;

    const blockPeriodOldVesting = (old.locked.toBigInt() / old.perBlock.toBigInt());
    const blocksPassedSinceVestingStart = (at - old.startingBlock.toBigInt());

    // We need to check if vesting is ongoing, is finished or has not yet started, as conversion will be different.
    if (blocksPassedSinceVestingStart > 0 && (blockPeriodOldVesting - blocksPassedSinceVestingStart) > 0) {
        // This defines the remaining blocks one must wait until his
        // vesting is over.
        //
        // Details:
        // * (locked/per_block): Number blocks on mainnet overall
        // * snapshot_block - starting_block: Number of vested blocks
        // * subtraction of the above two: How many blocks remain
        // * Division by two: Take into account 12s block time
        let remainingBlocks = (blockPeriodOldVesting - blocksPassedSinceVestingStart) / BigInt(2);
        // This defines the remaining locked amount. Same as if a person has called vest once at the snapshot block.
        remainingLocked = old.locked.toBigInt() - (blocksPassedSinceVestingStart * old.perBlock.toBigInt());
        newPerBlock = remainingLocked / remainingBlocks;
        newStartingBlock = BigInt(0);

    } else if ((blockPeriodOldVesting - blocksPassedSinceVestingStart) <= 0 ) {
        // If vesting is finished -> use same start block and give everything at first block
        remainingLocked = old.locked.toBigInt();
        newPerBlock = old.locked.toBigInt();
        newStartingBlock = BigInt(0);

    } else if ((old.startingBlock.toBigInt() - at) >= 0){
        // If vesting has not started yes -> use same start block and multiply per block by 2 to take into account
        // 12s block time.
        remainingLocked = old.locked.toBigInt();
        newPerBlock = old.perBlock.toBigInt() * BigInt(2);
        newStartingBlock = old.startingBlock.toBigInt() - at;

    } else {
        throw Error("Unreachable code... Came here with old vesting info of: " + old.toHuman());
    }

    let newVesting = await toApi.createType("VestingInfo", [remainingLocked, newPerBlock, newStartingBlock]);

    return new StorageMapValue(newVesting.toU8a(true), completeKey);
}

export abstract class StorageItem {
    value: number[] | Uint8Array;

    constructor(value: number[] | Uint8Array) {
        this.value = value;
    }
}

export class StorageValueValue extends StorageItem {
    constructor(value: number[] | Uint8Array) {
        super(value);
    }
}

export class StorageMapValue extends StorageItem {
    patriciaKey: number[] | Uint8Array;

    constructor(value: number[] | Uint8Array, key: number[] | Uint8Array) {
        super(value);

        this.patriciaKey = key;
    }

}

export class StorageDoubleMapValue extends StorageItem {
    patriciaKey1: number[] | Uint8Array;
    patriciaKey2: number[] | Uint8Array;

    constructor(value: number[] | Uint8Array, key1: number[] | Uint8Array, key2: number[] | Uint8Array) {
        super(value);

        this.patriciaKey1 = key1;
        this.patriciaKey2 = key2;
    }
}

export async function test_run() {
    const wsProviderFrom = new WsProvider("wss://fullnode.centrifuge.io");
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
            console.log("Storage with key " + key + " is not available")
            storageItems.filter((val) => key != val)
        }
    }


    const lastHdr = await fromApi.rpc.chain.getHeader();
    let at = lastHdr.hash;

    let migrationData = await transform(fromApi, toApi, storageItems, at);

    fromApi.disconnect();
    toApi.disconnect();
}
