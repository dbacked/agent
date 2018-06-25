"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (process.env.DEBUG_MODE) {
    const longjohn = require('longjohn');
    longjohn.async_trace_limit = -1;
}
const yargs = require("yargs");
const installAgent_1 = require("./lib/installAgent");
const constants_1 = require("./lib/constants");
const backupJobManager_1 = require("./lib/backupJobManager");
yargs.command('install-agent', 'Install the backup agent on the server', (commandYargs) => commandYargs.option('y', {
    describe: 'Disable the questions and directly read responses from the config file: /etc/dbacked/config.json',
    boolean: true,
}), (commandYargs) => {
    installAgent_1.installAgent(commandYargs);
}).command('start-agent', 'Start the backup agent', (commandYargs) => commandYargs
    .option('apikey', { string: true, describe: 'DBacked API key (can also be provided with the DBACKED_APIKEY env variable)' })
    .option('db-type', { string: true, desc: 'Database type (pg or mysql) (env variable: DBACKED_DB_TYPE)' })
    .option('db-host', { string: true, desc: 'Database host (env variable: DBACKED_DB_HOST)' })
    .option('db-username', { string: true, desc: 'Database username (env variable: DBACKED_DB_USERNAME)' })
    .option('db-password', { string: true, desc: 'Database password (env variable: DBACKED_DB_PASSWORD)' })
    .option('db-name', { string: true, desc: 'Database name (env variable: DBACKED_DB_NAME)' })
    .option('public-key', { string: true, desc: 'Public key linked to the project (env variable: DBACKED_PUBLIC_KEY)' })
    .option('config-directory', { string: true, desc: 'Directory where the agent id and others files are stored, default /etc/dbacked' })
    .option('daemon', { boolean: true, desc: 'Detach the process as a daemon, will check if another daemon is not already started' })
    .option('daemon-name', { string: true, desc: 'Allows multiple daemons to be started at the same time under different names' }), (commandYargs) => {
    backupJobManager_1.agentLoop(commandYargs);
}).demandCommand()
    .version(constants_1.VERSION.join('.'))
    .strict()
    .parse();
process.on('unhandledRejection', (e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=index.js.map