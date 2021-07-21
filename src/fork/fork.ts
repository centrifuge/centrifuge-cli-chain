// Here comes the oclif specific stuff
import Command, {flags} from '@oclif/command'
import {ApiPromise, WsProvider} from "@polkadot/api";
import {StorageKey} from "@polkadot/types";
import { xxhashAsHex} from "@polkadot/util-crypto";
import {Hash } from "@polkadot/types/interfaces";

import {checkAvailability, getDefaultStorage, parseModuleInput, StorageElement} from "../common/common";

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

        // Transform modules input
        let storageItems = flags["modules"].map((value, index) => {
            return parseModuleInput(value);
        });

        if (!flags["no-default"]) {
            storageItems.push(...getDefaultStorage());
        }


        const metadataFrom = await this.api.rpc.state.getMetadata();

        if (!await checkAvailability(metadataFrom.asLatest.modules, metadataFrom.asLatest.modules, storageItems)) {
            // TODO: Log error and abort
        }


        let at: Hash;
        if (flags["at-block"] == '-1') {
            const lastHdr = await this.api.rpc.chain.getHeader();
            at = lastHdr.hash;
        } else {
            let bn = parseInt(flags['from-block']);
            if (bn !== undefined) {
                at = await this.api.rpc.chain.getBlockHash(bn);
            } else {
                // TODO: Log error and abort
            }
        }

        try {
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
        } catch (err) {
            // TODO: Log error and abort
        }
    }
}

export async function fork(api: ApiPromise, storageItems: Array<StorageElement>, at: Hash): Promise<Map<string, Array<[ StorageKey, Uint8Array | number[]]>>>   {
    let state: Map<string, Array<[ StorageKey, Uint8Array | number[]]>> = new Map();

    for (const element of storageItems) {
        let data = await fetchState(api, at, api.createType("StorageKey", element.key));

        state.set(element.key, data);
    }

    return state;
}

async function fetchState(api: ApiPromise, at: Hash, key: StorageKey): Promise<Array<[ StorageKey, Uint8Array | number[]]>> {
    console.log("Fetching storage for prefix: " + key.toHuman());

    // The substrate api does provide the actual prefix, as the next_key, as we do here, when next key
    // is not available. In order to use the at option, we do this here upfront.
    let keyArray = await api.rpc.state.getKeysPaged(key, 1000, key, at);

    // getKeysPaged does not work for StorageValues, lets try if it is one
    if (keyArray === undefined || keyArray.length === 0) {
        console.log("Fetched keys: 1");
        let value = await api.rpc.state.getStorage(key);

        if (value !== undefined) {
            // @ts-ignore
            let valueArray = value.toU8a(true);
            console.log("Fetched storage values: 1/1");

            if (valueArray.length > 0) {
                return [[key, valueArray]];
            } else {
                console.log("ERROR: Fetched empty storage value for key " + key.toHex() + "\n");
                return [];
            }
        }
    }

    let fetched = false;
    let accumulate = keyArray.length;

    while (!fetched) {
        let nextStartKey = api.createType("StorageKey", keyArray[keyArray.length - 1]);
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

    let pairs: Array<[StorageKey, Uint8Array | number[]]> = [];

    accumulate = 0;
    for (const storageKey of keyArray) {
        let storageValue = await api.rpc.state.getStorage(storageKey);
        // @ts-ignore
        let storageArray = storageValue.toU8a(true);

        if (storageArray !== undefined && storageArray.length > 0) {
            pairs.push([storageKey, storageArray]);
        } else {
            console.log("ERROR: Fetched empty storage value for key " + storageKey.toHex() + "\n");
        }

        accumulate = accumulate + 1;
        process.stdout.write("Fetched storage values: " + accumulate + "/" + keyArray.length + "\r");
    }

    process.stdout.write("\n");

    return pairs;
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


    let storageItems = new Array();
    storageItems.push(...getDefaultStorage());

    const lastFromHdr = await fromApi.rpc.chain.getHeader();
    let at = lastFromHdr.hash;

    let state: Map<string, Array<[ StorageKey, Uint8Array | number[]]>> = await fork(fromApi, storageItems, at);

    await fromApi.disconnect()
}