import {AccountId, Balance, BlockNumber} from "@polkadot/types/interfaces";
import {ApiPromise} from "@polkadot/api";
import * as fs from 'fs';
import * as papaparse from 'papaparse';

export async function test_run() {
    //let grantes = await loadCSV(, true);


    // Connect to API

}

async function loadCSV(file: string, isVesting: boolean): Promise<Array<string>>{
    let read =  fs.readFileSync(file, 'utf8');
    let resultsLocal: Array<string>;
    papaparse.parse(read, {
            complete: function (results) {
                resultsLocal = results;
            }
        }
    );

    return resultsLocal;

}

async function verify(grantes: Array<Grant>) {

}

class Grant {
    readonly grantee: AccountId;
    readonly amount: Balance;

    constructor(who: AccountId, howMuch: Balance) {
        this.grantee = who;
        this.amount = howMuch;
    }

    async verify(api: ApiPromise) {

    }
}

class VestingGrant extends Grant {
    readonly vestingStart: BlockNumber;
    readonly vestingPeriod: BlockNumber;
    readonly perBlock: Balance;

    constructor(who: AccountId, howMuch: Balance, start: BlockNumber, period: BlockNumber, perBlock: Balance) {
        super(who, howMuch);

        this.vestingStart = start;
        this.vestingPeriod = period;
        this.perBlock = perBlock;
    }

    async verify(api: ApiPromise) {

    }
}
