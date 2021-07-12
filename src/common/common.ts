import {xxhashAsHex} from "@polkadot/util-crypto";
import {StorageItem} from "../transform/transform";
import {ApiTypes, SubmittableExtrinsic} from "@polkadot/api/types";
import {ApiPromise, SubmittableResult} from "@polkadot/api";
import {Hash, Index, Key} from "@polkadot/types/interfaces";
import {KeyringPair} from "@polkadot/keyring/types";
import {StorageKey} from "@polkadot/types";


export const DefaultStorage = [
    xxhashAsHex("System", 128) + xxhashAsHex("Account", 128).slice(2),
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

export class Dispatcher {
    readonly maxConcurrent: number;
    readonly perBlock: number;
    readonly cbErr: (xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) => void;
    readonly signer: KeyringPair;
    private running: number;
    private dispatched: bigint;
    private api: ApiPromise;
    private nonce: bigint;
    private dispatchHashes: Array<[Hash, bigint]>;

    constructor(api: ApiPromise, keypair: KeyringPair, startingNonce: bigint, cbErr?: (xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) => void, perBlock: number = 100, concurrent: number = 500) {
        if (cbErr !== undefined) {
            this.cbErr = cbErr;
        } else {
            this.cbErr = (xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) => {
            };
        }

        this.api = api;
        this.nonce = startingNonce;
        this.maxConcurrent = concurrent;
        this.running = 0;
        this.perBlock = perBlock;
        this.signer = keypair;
        this.dispatched = BigInt(0);
        this.dispatchHashes = new Array();
    }

    async nextNonce(): Promise<bigint>{
        let tmp = this.nonce;
        this.nonce = tmp + BigInt(1);
        return tmp;
    }

    async dryRun(xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>): Promise<boolean> {
        for(const xt of xts) {
            let result = await xt.dryRun(this.signer);

            // @ts-ignore
            if (result.isErr()){
                return false;
            }
        }

        return true;
    }


    async dispatch(xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>, inSequence: boolean = false) {
        if (!await this.dryRun(xts)) {
            this.cbErr(xts)
            return;
        }

        if (inSequence) {
            await this.dispatchInternalInSequence(xts);
        } else {
            await this.dispatchInternal(xts);
        }

    }

    private async dispatchInternal(xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) {
        let counter = 0;
        for (const extrinsic of xts) {
            counter += 1;

            if (counter % this.perBlock === 0) {
                await new Promise(r => setTimeout(r, 6000));
            }

            while (this.running >= this.maxConcurrent) {
                await new Promise(r => setTimeout(r, 6000));
            }
            this.dispatched += BigInt(1);
            this.running += 1;

            const unsub = await extrinsic.signAndSend(this.signer, {nonce: -1}, ({events = [], status}) => {
                if (status.isInBlock) {
                    events.forEach(({event: {data, method, section}, phase}) => {
                        if (method === 'ExtrinsicSuccess') {
                            this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                        } else if (method === 'ExtrinsicFailed') {
                            this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()])
                            this.cbErr([extrinsic])
                        }

                        this.running -= 1;
                    });
                } else if (status.isFinalized) {
                    // @ts-ignore
                    unsub();
                }
            // @ts-ignore
            }).catch((err) => {
                this.running -= 1;
                this.dispatched -= BigInt(1);
                this.cbErr(xts);
                console.log(err)
            });
        }
    }

    async getResults() : Promise<Array<[Hash, bigint]>> {
        while (BigInt(this.dispatchHashes.length) !== this.dispatched && this.running !== 0) {
            process.stdout.write("Waiting for results. Returned calls " + this.dispatchHashes.length + " vs. dispatched " + this.dispatched + ". Running: " + this.running + " \r");
            await new Promise(r => setTimeout(r, 6000));
        }

        return this.dispatchHashes
    }


    private async dispatchInternalInSequence(xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) {
        let xt = xts.shift();

        let callNext = async () => {
            let extrinsic = xts.shift();

            while (this.running >= this.maxConcurrent) {
                await new Promise(r => setTimeout(r, 6000));
            }
            this.dispatched += BigInt(1);
            this.running += 1;

            const unsub = await extrinsic.signAndSend(this.signer, {nonce: -1}, ({events = [], status}) => {
                if (status.isInBlock) {
                    events.forEach(({event: {data, method, section}, phase}) => {
                        if (method === 'ExtrinsicSuccess') {
                            this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                            callNext();
                        } else if (method === 'ExtrinsicFailed') {
                            this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()])
                            this.cbErr([extrinsic])
                        }

                        this.running -= 1;
                    });
                } else if (status.isFinalized) {
                    // @ts-ignore
                    unsub();
                }
            // @ts-ignore
            }).catch((err) => {
                this.running -= 1;
                this.dispatched -= BigInt(1);
                this.cbErr(xts);
                console.log(err)
            });
        }

        while (this.running >= this.maxConcurrent) {
            await new Promise(r => setTimeout(r, 6000));
        }
        this.dispatched += BigInt(1);
        this.running += 1;

        const unsub = await xt.signAndSend(this.signer, {nonce: -1}, ({events = [], status}) => {
            if (status.isInBlock) {
                events.forEach(({event: {data, method, section}, phase}) => {
                    if (method === 'ExtrinsicSuccess') {
                        this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                        callNext();
                    } else if (method === 'ExtrinsicFailed') {
                        this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()])
                        this.cbErr([xt])
                    }

                    this.running -= 1;
                });
            } else if (status.isFinalized) {
                // @ts-ignore
                unsub();
            }
        // @ts-ignore
        }).catch((err) => {
            this.running -= 1;
            this.dispatched -= BigInt(1);
            this.cbErr(xts);
            console.log(err)
        });
    }


    async sudoDispatch(xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) {
        /*if (!await this.dryRun(xts)) {
            this.cbErr(xts)
        }*/

        let counter = 0;
        for (const extrinsic of xts) {
            counter += 1;

            if (counter % this.perBlock === 0) {
                await new Promise(r => setTimeout(r, 6000));
                console.log("Waiting in perBlock... " + counter)
            }

            while (this.running >= this.maxConcurrent) {
                await new Promise(r => setTimeout(r, 6000));
                console.log("Waiting in line... " + counter)
            }
            this.dispatched += BigInt(1);
            this.running += 1;
            console.log("Sending with nonce " + this.nonce + ", running " + this.running +" : " + extrinsic.meta.name.toString());

            let activeNonce = await this.nextNonce();
            const unsub = await this.api.tx.sudo.sudo(extrinsic)
                .signAndSend(this.signer, {nonce: activeNonce}, ({events = [], status}) => {
                    if (status.isInBlock || status.isFinalized) {
                        console.log("Sending with nonce " + activeNonce + " is in Block/Finalized : " + extrinsic.meta.name.toString());
                        events.filter(({ event }) =>
                                this.api.events.sudo.Sudid.is(event)
                            )
                            .forEach(({ event : { data: [result]}, phase }) => {
                                // We know that `Sudid` returns just a `Result`
                                // @ts-ignore
                                if (result.isError) {
                                    this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                    this.cbErr([extrinsic])
                                    console.log("Sudo error: " + activeNonce);
                                } else {
                                    this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                                    console.log("Sudo ok: " + activeNonce);
                                }
                            });

                        this.running -= 1;
                        // @ts-ignore
                        unsub();
                    }
            }).catch((err) => {
                this.running -= 1;
                this.dispatched -= BigInt(1);
                this.cbErr([extrinsic]);
                console.log(err)
            });
        }
    }

    async batchDispatch(xts: Array<SubmittableExtrinsic<ApiTypes, SubmittableResult>>) {
        if (!await this.dryRun(xts)) {
            this.cbErr(xts)
        }

        while (this.running >= this.maxConcurrent) {
            await new Promise(r => setTimeout(r, 6000));
        }
        this.dispatched += BigInt(1);
        this.running += 1;

        const unsub = await this.api.tx.utility
            .batch(xts)
            .signAndSend(this.signer, { nonce: -1 }, ({ status, events }) => {
                if (status.isInBlock) {
                    events.forEach(({event: {data, method, section}, phase}) => {
                        if (method === 'ExtrinsicSuccess') {
                            this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                        } else if (method === 'ExtrinsicFailed') {
                            this.dispatchHashes.push([status.asInBlock, phase.asApplyExtrinsic.toBigInt()]);
                            this.cbErr(xts);
                        }
                    });

                    this.running -= 1;
                } else if (status.isFinalized) {
                    // @ts-ignore
                    unsub();
                }
            }).catch((err) => {
                this.running -= 1;
                this.dispatched -= BigInt(1);
                this.cbErr(xts);
                console.log(err)
            });
    }
}