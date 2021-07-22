# WIP README
This repo shall in the future represent a simple plugin for the centrifuge cli.
As currently, the cli is heavy WIP and we are restructuring the main repo to actually handle
multiple internal plugins (in order to avoid publishing every unfinished content to NPM) the code of this 
cli can also be used "standalone". Althouhg, it is then not a cli, but must be adapted to the
wished command manually. 

In order to test a migration for example one must do two things.
1. in the "src/migration/migration.rs" file, the function "test_run"
   - Insert the wanted modules
    - Change the used ws-endpoints if necessary
    - Change the block number from which we take the state at the old chain and change the block
     number to where to put the state on the new chain. 
2. in the "index.js" file
   - change the called function in main to "test_run_migration"
    

Once, the plugin here is integrate into the centrifuge cli, all these options (and more) are available 
as command line arguments.
