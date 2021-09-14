// Here comes the oclif specific stuff
import Command, {flags} from '@oclif/command'
import {ApiPromise, WsProvider} from "@polkadot/api";
import { xxhashAsHex } from "@polkadot/util-crypto";
import {Balance, Hash, ProxyDefinition} from "@polkadot/types/interfaces";
import { fork } from "../fork/fork";
import {
    insertOrNewMap,
    StorageElement,
    parseModuleInput,
    checkAvailability, getDefaultStorage, PalletElement, StorageItemElement, toByteArray
} from "../common/common";
import {StorageKey} from "@polkadot/types";

const AvailableTransformations = [
    parseModuleInput("Balances.TotalIssuance"),
    parseModuleInput("System.Account"),
    parseModuleInput("Vesting.Vesting"),
    parseModuleInput("Proxy.Proxies"),
];

export default class TransformCommand extends Command {
    fromApi: ApiPromise;
    toApi: ApiPromise;

    static description = 'transform the centrifuge state from mainnet to a parachain compatible state';

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
        'output': flags.boolean({
            char: 'o',
            description: 'If provided defines, where to ouput, the transformed data (Key, value)-pairs.'
        }),
        'modules': flags.string({
            char: 'm',
            multiple: true,

        }),
        'no-default': flags.boolean({
            description: 'Do not transform the default storage.',
        }),
    };

    async run() {
        const {flags} = this.parse(TransformCommand);

        if (flags["source-network"] === flags["destination-network"]) {
            // TODO: Log error and abort
        }

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
            if(!AvailableTransformations.includes(item)) {
                // TODO: Log error and abort
            }
        }

        const metadataFrom = await this.fromApi.rpc.state.getMetadata();
        const metadataTo = await this.toApi.rpc.state.getMetadata();

        if (!await checkAvailability(metadataFrom.asLatest.modules, metadataTo.asLatest.modules, storageItems)) {
            // TODO: Log error and abort
        }


        let started = await this.fromApi.rpc.chain.getHeader();

        let from: Hash;
        if (flags["from-block"] == '-1') {
            const lastHdr = started;
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
            let state = await transform(this.fromApi, this.toApi, started, storageItems, from, to);

            if (flags["output"]) {
                // TODO: Write stuff to a file here, correctly as a json
                //       * define json format
            }

        } catch (err) {
            // TODO: Do something with the error
        }
    }
}

export async function transform(fromApi: ApiPromise, toApi: ApiPromise, startAt: Hash,  storageItems: Array<StorageElement>, atFrom: Hash, atTo: Hash): Promise<Map<string, Map<string, Array<StorageItem>>>>   {
    let forkData = Array.from(await fork(fromApi, storageItems, atFrom));

    let state: Map<string, Map<string, Array<StorageItem>>> = new Map();

    // For every prefix do the correct transformation.
    for (let [key, keyValues] of forkData) {
        // Match all prefixes we want to transform
        if (key.startsWith(xxhashAsHex("System",128))) {
             let palletKey = xxhashAsHex("System", 128);
             let migratedPalletStorageItems = await transformSystem(fromApi, toApi, keyValues);
             state.set(palletKey, migratedPalletStorageItems)

        } else if (key.startsWith(xxhashAsHex("Balances", 128))) {
            let palletKey = xxhashAsHex("Balances", 128);
            let migratedPalletStorageItems = await transformBalances(fromApi, toApi, keyValues);
            state.set(palletKey, migratedPalletStorageItems)

        } else if (key.startsWith(xxhashAsHex("Vesting", 128))) {
            let palletKey = xxhashAsHex("Vesting", 128);
            let migratedPalletStorageItems = await transformVesting(fromApi, toApi, keyValues, startAt, atFrom, atTo);
            state.set(palletKey, migratedPalletStorageItems)

        } else if (key.startsWith(xxhashAsHex("Proxy", 128))) {
            let palletKey = xxhashAsHex("Proxy", 128);
            let migratedPalletStorageItems = await transformProxy(fromApi, toApi, keyValues);
            state.set(palletKey, migratedPalletStorageItems)

        }  else {
            console.log("Fetched data that can not be transformed. PatriciaKey is: " + key);
        }
    }

    return state;
}

async function transformProxy(fromApi: ApiPromise, toApi: ApiPromise, keyValues: Array<[StorageKey, Uint8Array | number[]]>):  Promise<Map<string, Array<StorageItem>>> {
    let state: Map<string, Array<StorageItem>> = new Map();

    // Match against the actual storage items of a pallet.
    for(let [patriciaKey, value] of keyValues) {
        if (patriciaKey.toHex().startsWith(xxhashAsHex("Proxy", 128) + xxhashAsHex("Proxies", 128).slice(2))) {
            let pkStorageItem = xxhashAsHex("Proxy", 128) + xxhashAsHex("Proxies", 128).slice(2);
            await insertOrNewMap(state, pkStorageItem, await transformProxyProxies(fromApi, toApi, patriciaKey, value));
        } else {
            console.log("Fetched data that can not be transformed. PatriciaKey is: " + patriciaKey.toHuman());
        }
    }

    return state;
}

async function transformProxyProxies(fromApi: ApiPromise, toApi: ApiPromise, completeKey: StorageKey, scaleOldProxies: number[] | Uint8Array): Promise<StorageItem> {
    // @ts-ignore, see https://github.com/polkadot-js/api/issues/3746
    let oldProxyInfo = fromApi.createType('(Vec<(AccountId, ProxyType)>, Balance)', scaleOldProxies);

    let proxies: Array<ProxyDefinition> = new Array();

    // For the checks if anonymous proxies, we check if CINC is part of the proxies. Which indicates, that
    // that it is indeed an anonymous proxy. As CINC itself is a multisig...
    const CINC =  fromApi.createType("AccountId", "4djGpfJtHkS3kXBNtSFijf8xHbBY8mYvnUR7zrLM9bCyF7Js");
    let CINCisDelegate = false;

    // 1. Iterate over all elements of the vector
    // 2. Create a `ProxyDefinition` for each element
    for (const oldElement of oldProxyInfo[0]) {
        let delegate = toApi.createType("AccountId", oldElement[0]);
        if (CINC.toHex() === delegate.toHex()) {
            CINCisDelegate = true;
        }

        let proxyType = toApi.createType("ProxyType", oldElement[1]);

        let delay = toApi.createType("BlockNumber", 0);

        let proxyDef = toApi.createType("ProxyDefinition",
            [
                delegate,
                proxyType,
                delay
            ]);

        proxies.push(proxyDef);
    }

    let deposit = toApi.createType("Balance", oldProxyInfo[1]);

    // @ts-ignore, see https://github.com/polkadot-js/api/issues/3746
    let newProxyInfo = toApi.createType('(Vec<ProxyDefinition<AccountId, ProxyType, BlockNumber>>, Balance)',
    [
                proxies,
                deposit
        ]
    );

    // We must somehow detect the anonymous proxies. This can only be done on a best effort basis.
    // The reason for this is, that when an anonymous proxy did some actions, that included the reserve of
    // his balances, the logic below will not detect it, if the reserve goes above the threshold. There is no other
    // way to detect an anonymous proxy otherwise...
    const proxiedAccount = fromApi.createType("AccountId", completeKey.slice(-32));
    const { nonce, data: balance } = await fromApi.query.system.account(proxiedAccount);
    const base = await fromApi.consts.proxy.proxyDepositBase;
    const perProxy = await fromApi.consts.proxy.proxyDepositFactor;

    let reserve: Balance;
    // In the case that we see that the amount reserved is smaller than 350 mCFG, we can be sure, that this
    // is an anonymous proxy. The reverse does not prove the non-existence of an anonymous proxy!
    // Hence, we must ensure, that we subtract 350 mCFg from the deposit, as this one is reserved on the creator!
    if (balance.reserved.toBigInt() < (BigInt(proxies.length) * perProxy.toBigInt()) + base.toBigInt()) {
        let amount = deposit.toBigInt() - (perProxy.toBigInt() + base.toBigInt());
        reserve = toApi.createType("Balance", amount);
    } else if (CINCisDelegate) {
        let amount = deposit.toBigInt() - (perProxy.toBigInt() + base.toBigInt());
        reserve = toApi.createType("Balance", amount);
    } else {
        reserve = toApi.createType("Balance", deposit);
    }

    return new StorageMapValue(newProxyInfo.toU8a(), completeKey, reserve);
}


async function transformSystem(fromApi: ApiPromise, toApi: ApiPromise, keyValues: Array<[StorageKey, Uint8Array | number[]]>):  Promise<Map<string, Array<StorageItem>>> {
    let state: Map<string, Array<StorageItem>> = new Map();

    // Match against the actual storage items of a pallet.
    for(let [patriciaKey, value] of keyValues) {
        let systemAccount = xxhashAsHex("System", 128) + xxhashAsHex("Account", 128).slice(2);
        if (patriciaKey.toHex().startsWith(systemAccount)) {
            let pkStorageItem = xxhashAsHex("System", 128) + xxhashAsHex("Account", 128).slice(2);
            await insertOrNewMap(state, pkStorageItem, await transformSystemAccount(fromApi, toApi, patriciaKey, value));
        } else {
            console.log("Fetched data that can not be transformed. PatriciaKey is: " + patriciaKey.toHuman());
        }
    }

    return state;
}

async function transformSystemAccount(fromApi: ApiPromise, toApi: ApiPromise, completeKey: StorageKey, scaleOldAccountInfo: number[] | Uint8Array): Promise<StorageItem> {
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

async function transformBalances(fromApi: ApiPromise, toApi: ApiPromise, keyValues: Array<[StorageKey, number[] | Uint8Array]>):  Promise<Map<string, Array<StorageItem>>>{
    let state: Map<string, Array<StorageItem>> = new Map();

    for(let [patriciaKey, value] of keyValues) {
        if (patriciaKey.toHex().startsWith(xxhashAsHex("Balances", 128) + xxhashAsHex("TotalIssuance", 128).slice(2))) {
            let pkStorageItem = xxhashAsHex("Balances", 128) + xxhashAsHex("TotalIssuance", 128).slice(2);
            await insertOrNewMap(state, pkStorageItem, await transformBalancesTotalIssuance(fromApi, toApi, patriciaKey, value));
        } else {
            console.log("Fetched data that can not be transformed. Part of Balances. PatriciaKey is: " + patriciaKey.toHex());
        }
    }

    return state;
}

async function transformBalancesTotalIssuance(fromApi: ApiPromise, toApi: ApiPromise, completeKey: StorageKey, scaleOldTotalIssuance: number[] | Uint8Array): Promise<StorageItem> {
    let oldIssuance = fromApi.createType("Balance", scaleOldTotalIssuance);
    let newIssuance = toApi.createType("Balance", oldIssuance.toU8a(true));

    if (oldIssuance.toBigInt() !== newIssuance.toBigInt()) {
        throw new Error("Transformation failed. TotalIssuance. (Left: " + oldIssuance.toJSON() + " vs. " + "Right: " + newIssuance.toJSON());
    }

    return new StorageValueValue(newIssuance.toU8a(true));
}

async function transformVesting(fromApi: ApiPromise, toApi: ApiPromise, keyValues: Array<[StorageKey, number[] | Uint8Array]>, startAt: Hash, atFrom: Hash, atTo: Hash):  Promise<Map<string, Array<StorageItem>>> {
    let state: Map<string, Array<StorageItem>> = new Map();
    const atFromAsNumber = (await fromApi.rpc.chain.getBlock(atFrom)).block.header.number.toBigInt();
    const atToAsNumber = (await toApi.rpc.chain.getBlock(atTo)).block.header.number.toBigInt();
    const startAtAsNumber =  (await toApi.rpc.chain.getBlock(startAt)).block.header.number.toBigInt();


    for(let [patriciaKey, value] of keyValues) {
        if (patriciaKey.toHex().startsWith(xxhashAsHex("Vesting", 128) + xxhashAsHex("Vesting", 128).slice(2))) {
            let pkStorageItem = xxhashAsHex("Vesting", 128) + xxhashAsHex("Vesting", 128).slice(2);
            await insertOrNewMap(state, pkStorageItem, await transformVestingVestingInfo(fromApi, toApi, patriciaKey, value, startAtAsNumber, atToAsNumber));

        } else {
            console.log("Fetched data that can not be transformed. PatriciaKey is: " + patriciaKey.toHuman());
        }
    }

    return state;
}

async function transformVestingVestingInfo(fromApi: ApiPromise, toApi: ApiPromise, completeKey: StorageKey, scaleOldVestingInfo: number[] | Uint8Array, atFrom: bigint, atTo: bigint): Promise<StorageItem> {
    let old = fromApi.createType("VestingInfo", scaleOldVestingInfo);

    let remainingLocked;
    let newPerBlock;
    let newStartingBlock;

    const blockPeriodOldVesting = (old.locked.toBigInt() / old.perBlock.toBigInt());
    const blocksPassedSinceVestingStart = (atFrom - old.startingBlock.toBigInt());

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
        newStartingBlock = atTo;

    } else if ((blockPeriodOldVesting - blocksPassedSinceVestingStart) <= 0 ) {
        // If vesting is finished -> use same start block and give everything at first block
        remainingLocked = old.locked.toBigInt();
        newPerBlock = old.locked.toBigInt();
        newStartingBlock = atTo;

    } else if ((old.startingBlock.toBigInt() - atFrom) >= 0){
        // If vesting has not started yes -> use starting block as (old - blocks_passed_on_old_mainnet) / 2 and multiply per block by 2 to take into account
        // 12s block time.
        remainingLocked = old.locked.toBigInt();
        newPerBlock = old.perBlock.toBigInt() * BigInt(2);
        newStartingBlock = ((old.startingBlock.toBigInt() - atFrom) / BigInt(2)) + atTo;

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
    patriciaKey: StorageKey;
    // Intentionally allow arbitrary data here. The user MUST now what will be used here
    optional: any;

    constructor(value: number[] | Uint8Array, key: StorageKey, optional?: any) {
        super(value);

        this.optional = optional;
        this.patriciaKey = key;
    }

}

export class StorageDoubleMapValue extends StorageItem {
    patriciaKey1: StorageKey;
    patriciaKey2: StorageKey;

    constructor(value: number[] | Uint8Array, key1: StorageKey, key2: StorageKey) {
        super(value);

        this.patriciaKey1 = key1;
        this.patriciaKey2 = key2;
    }
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

    const wsProviderTo = new WsProvider("ws://127.0.0.1:9946"); // Or: wss://fullnode-collator.charcoal.centrifuge.io
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

    let migrationData = await transform(fromApi, toApi, storageItems, at, to);

    // This can be used to output rust code for the unit test of the pallet_migration_manager
    // await transformToRustCode(fromApi, toApi, 6400000);

    fromApi.disconnect();
    toApi.disconnect();
}

async function transformToRustCode(fromApi: ApiPromise, toApi:ApiPromise, atNum: number) {

    let storageItems = new Array();
    storageItems.push(...getDefaultStorage());
    const lastFromHdr = await fromApi.rpc.chain.getHeader();
    let at = await  fromApi.rpc.chain.getBlockHash(atNum);
    const lastToHdr = await toApi.rpc.chain.getHeader();
    let to = lastToHdr.hash

    let state = await transform(fromApi, toApi, storageItems, at, to);

    for (const element of storageItems) {
        if (element instanceof StorageItemElement) {
            if (element.pallet === "System" && element.item === "Account") {
                let data = state.get(element.palletHash)?.get(element.key);
                let count = data.length;
                let bytesKey = 0;
                let bytesValue = 0;

                let msg = "pub const SYSTEM_ACCOUNT: [AccountKeyValue;" + count.toString() + "] = [ \n";
                for (const keyValue of data) {
                    if (keyValue instanceof StorageMapValue) {
                        bytesKey = keyValue.patriciaKey.toU8a(true).length;
                        bytesValue = Array.from(keyValue.value).length;

                        let intermMsg = "AccountKeyValue { \n";
                        intermMsg += "key: [ \n";
                        intermMsg +=  Array.from(keyValue.patriciaKey.toU8a(true)).toString() + "\n";
                        intermMsg +=  "], \n value: [ \n";
                        intermMsg +=  Array.from(keyValue.value).toString() + "\n";
                        intermMsg += "], \n },"

                        msg += intermMsg;
                    }
                }

                msg += "\n]; \n\n"

                msg  += "pub struct AccountKeyValue { \n"
                    + "pub key: [u8;" + bytesKey.toString() + "], \n"
                    + "pub value: [u8;" + bytesValue.toString() + "] \n"
                    + "}"

                console.log(msg);
                console.log();
            } else if (element.pallet === "Vesting" && element.item === "Vesting") {
                let data = state.get(element.palletHash)?.get(element.key);
                let count = data.length;
                let bytesKey = 0;
                let bytesValue = 0;

                let msg = "pub const VESTING_VESTING: [VestingKeyValue;" + count.toString() + "] = [ \n";
                for (const keyValue of data) {
                    if (keyValue instanceof StorageMapValue) {
                        bytesKey = keyValue.patriciaKey.toU8a(true).length;
                        bytesValue = Array.from(keyValue.value).length;

                        let intermMsg = "VestingKeyValue { \n";
                        intermMsg += "key: [ \n";
                        intermMsg +=  Array.from(keyValue.patriciaKey.toU8a(true)).toString() + "\n";
                        intermMsg +=  "], \n value: [ \n";
                        intermMsg +=  Array.from(keyValue.value).toString() + "\n";
                        intermMsg += "], \n },"

                        msg += intermMsg;
                    }
                }

                msg += "\n]; \n\n"

                msg  += "pub struct VestingKeyValue { \n"
                    + "pub key: [u8;" + bytesKey.toString() + "], \n"
                    + "pub value: [u8;" + bytesValue.toString() + "] \n"
                    + "}"

                console.log(msg);
                console.log();
            } else if (element.pallet === "Proxy" && element.item === "Proxies") {
                let data = state.get(element.palletHash)?.get(element.key);
                let count = data.length;
                let bytesKey = 0;
                let bytesOptional = 0;

                let msg = "#[allow(non_snake_case)]\n"
                    + "pub fn PROXY_PROXIES() -> Vec<ProxiesKeyValue> {\n"
                    + "vec![\n"

                for (const keyValue of data) {
                    if (keyValue instanceof StorageMapValue) {
                        bytesKey = keyValue.patriciaKey.toU8a(true).length;
                        bytesOptional = Array.from(keyValue.optional.toU8a(true)).length;


                        let intermMsg = "ProxiesKeyValue { \n"
                            + "key: [ \n"
                            +  Array.from(keyValue.patriciaKey.toU8a(true)).toString() + "\n"
                            + "], \n"
                            + "value: vec![ \n"
                            + Array.from(keyValue.value).toString() + "\n"
                            + "],\n"
                            + "optional: [ \n"
                            + Array.from(keyValue.optional.toU8a(true)).toString() + "\n"
                            + "],\n"
                            + "\n },"

                        msg += intermMsg;
                    }
                }

                msg += "\n]\n} \n\n"

                msg  += "pub struct ProxiesKeyValue { \n"
                    + "pub key: [u8;" + bytesKey.toString() + "], \n"
                    + "pub value: Vec<u8>, \n"
                    + "pub optional: [u8;" + bytesOptional.toString() + "], \n"
                    + "}"

                console.log(msg);
                console.log();
            } else if (element.pallet === "Balances" && element.item === "TotalIssuance") {
                let data = state.get(element.palletHash)?.get(element.key);
                let count = data.length;
                let bytesKey = 0;
                let bytesValue = 0;

                let msg = "pub const TOTAL_ISSUANCE: TotalIssuanceKeyValue = \n";
                for (const keyValue of data) {
                    bytesKey = (await toByteArray(element.key.slice(2))).length;
                    bytesValue = Array.from(keyValue.value).length;

                    let intermMsg = "TotalIssuanceKeyValue { \n";
                    intermMsg += "key: [ \n";
                    intermMsg +=  (await toByteArray(element.key.slice(2))).toString() + "\n";
                    intermMsg +=  "], \n value: [ \n";
                    intermMsg +=  Array.from(keyValue.value).toString() + "\n";
                    intermMsg += "], \n };"

                    msg += intermMsg;
                }

                msg += "\n\n"

                msg  += "pub struct TotalIssuanceKeyValue { \n"
                    + "pub key: [u8;" + bytesKey.toString() + "], \n"
                    + "pub value: [u8;" + bytesValue.toString() + "] \n"
                    + "}"

                console.log(msg);
                console.log();
            }
        }
    }
}
