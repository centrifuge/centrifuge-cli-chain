// Here comes the oclif specific stuff
import Command, {flags} from '@oclif/command'
import {ApiPromise, WsProvider} from "@polkadot/api";
import {StorageKey} from "@polkadot/types";
import { xxhashAsHex} from "@polkadot/util-crypto";
import {Hash } from "@polkadot/types/interfaces";

import { DefaultStorage } from "../common/common";

export default class ForkCommand extends Command {
    api: ApiPromise;

    static description = 'fork the state of an existing substrate based chain';

    static flags = {
        'source-network': flags.string({
            char: 's',
            description: 'the networks ws-endpoint the state shall be forked from',
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
        const {flags} = this.parse(ForkCommand);

        const wsProvider = new WsProvider(flags["source-network"]);
        const api = await ApiPromise.create({
            provider: wsProvider
        });

        this.api = api;

        let storageItems = flags["modules"];

        // Transfrom modules into correct hashes
        storageItems.forEach((item) => {

        });

        if (!flags["no-default"]) {
            storageItems.push(...DefaultStorage);
        }

        const metadata = await api.rpc.state.getMetadata();
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
            const lastHdr = await api.rpc.chain.getHeader();
            at = lastHdr.hash;
        } else {
            at = api.createType("Hash", flags["at-block"]);
        }

        let state = await fork(api, storageItems, at);


        if (flags["as-genesis"]) {
            // TODO: Here the stuff to
            //       * create specs for forked chain
            //       * output spec somewhere
        }

        if (flags["output"]) {
            // TODO: Write stuff to a file here, correctly as a json
            //       * define json format
        }

        console.log(JSON.stringify(state));

    }
}

export async function fork(api: ApiPromise, storageItems: Array<string>, at: Hash): Promise<Map<string, Array<[ Uint8Array | number[], Uint8Array | number[]]>>>   {
    let state: Map<string, Array<[ Uint8Array | number[], Uint8Array | number[]]>> = new Map();

    for (const item of storageItems) {
        let asKey: StorageKey = api.createType("StorageKey", item);
        let data = await fetchState(api, at, asKey);

        state.set(item, data);
    }

    return state;
}

async function fetchState(api: ApiPromise, at: Hash, key: StorageKey): Promise<Array<[ Uint8Array | number[], Uint8Array | number[]]>> {
    console.log("Fetching storage for prefix: " + key.toHuman());

    let keyArray = await api.rpc.state.getKeysPaged(key, 1000);
    let fetched = false;
    let accumulate = keyArray.length;

    while (!fetched) {
        let nextStartKey = keyArray[keyArray.length - 1];
        let intermArray = await api.rpc.state.getKeysPaged(key, 1000, nextStartKey, at);

        accumulate = accumulate + intermArray.length;
        process.stdout.write("Fetched keys: " + accumulate + "\r");

        if (intermArray.length === 0) {
            fetched = true;
        } else {
            keyArray.push(...intermArray);
        }
    }

    process.stdout.write("\n");

    let pairs: Array<[Uint8Array | number[], Uint8Array | number[]]> = [];

    accumulate = 0;
    for (const storageKey of keyArray) {
        let storageValue = await api.rpc.state.getStorage(storageKey);
        // TODO: Not sure, why the api does solely provide an unknown here and how we can tell the compiler
        //       that it will have an toU8a method.
        // @ts-ignore
        pairs.push([storageKey.toU8a(true), storageValue.toU8a(true)]);

        accumulate = accumulate + 1;
        process.stdout.write("Fetched storage values: " + accumulate + "/" + keyArray.length + "\r");
    }

    process.stdout.write("\n");

    return pairs;
}

export async function test_run() {
    const wsProvider = new WsProvider("wss://fullnode.centrifuge.io");
    const api = await ApiPromise.create({
        provider: wsProvider
    });


    let storageItems: Array<string> = [
        //xxhashAsHex('Vesting', 128)
    ];

    storageItems.push(...DefaultStorage);

    const metadata = await api.rpc.state.getMetadata();

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


    const lastHdr = await api.rpc.chain.getHeader();
    let at = lastHdr.hash;

    let state: Map<string, Array<[ Uint8Array | number[], Uint8Array | number[]]>> = await fork(api, storageItems, at);

    let data: Array<[ Uint8Array | number[], Uint8Array | number[]]> = state.get(DefaultStorage[0]);

}