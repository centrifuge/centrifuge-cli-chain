import {Hash} from "@polkadot/types/interfaces";
import {StorageKey} from "@polkadot/types";
import {ApiPromise} from "@polkadot/api";
import {xxhashAsHex} from "@polkadot/util-crypto";
import {StorageItem} from "../transform/transform";

export const DefaultStorage = [
    xxhashAsHex("System", 128),
    xxhashAsHex("Balances", 128),
];

export async function insertOrNewMap(map: Map<string, Array<any>>, key: string, item: any) {
    if (map.has(key)) {
        let itemsArray = map.get(key);
        itemsArray.push(item);
    } else {
        let itemsArray: Array<StorageItem> = new Array();
        itemsArray.push(item);
        map.set(key, itemsArray);
    }
}

export async function toHexString(byteArray: Uint8Array | number[]): Promise<string> {
    let hex: Array<string> = [];
    let asArray = Array.from(byteArray);

    for (let byte of asArray) {
        let val =  ('0' + (byte & 0xFF).toString(16)).slice(-2);
        hex.push(val)
    }

    return hex.join('')
}

export async function toByteArray(hexString: string): Promise<Uint8Array> {
    if (hexString.length % 2 !== 0) {
        throw "Must have an even number of hex digits to convert to bytes";
    }

    const numBytes = hexString.length / 2;
    let byteArray = new Uint8Array(numBytes);

    for (let i = 0; i < numBytes; i++) {
        byteArray[i] = parseInt(hexString.substr(i*2, 2), 16);
    }

    return byteArray;
}