// Tasks of this module
//
// *dd Distribute the inputs to the correct commands

import { test_run as test_run_fork } from './fork/fork.js';
import { test_run as test_run_transform } from './transform/transform.js';
import { test_run as test_run_migrate } from './migrate/migrate.js';
import {test_run as test_run_common} from './common/common.js';
import * as fork from './fork/fork.js';
import * as transform from './transform/transform.js';
import * as migrate from './migrate/migrate.js';

async function main() {
    //await test_run_fork();
    //await test_run_transform();
    await test_run_migrate();
    //await test_run_common();
}

main().then().catch((e) => console.log(e))