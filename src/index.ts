// Tasks of this module
//
// *dd Distribute the inputs to the correct commands

import { test_run as test_run_fork } from './fork/fork.js';
import { test_run as test_run_transform } from './transform/transform.js';
import { test_run as test_run_migrate } from './migrate/migrate.js';


async function main() {
    await test_run_migrate();
}

main().then().catch((e) => console.log(e))