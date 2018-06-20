"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
if (process.env.DEBUG_MODE) {
    const longjohn = require('longjohn');
    longjohn.async_trace_limit = -1;
}
const program = require("commander");
const daemon = require("daemonize-process");
const lockfile = require("proper-lockfile");
const fs_1 = require("fs");
const util_1 = require("util");
const downgradeRoot = require("downgrade-root");
const dbackedApi_1 = require("./lib/dbackedApi");
const delay_1 = require("./lib/delay");
const log_1 = require("./lib/log");
const config_1 = require("./lib/config");
const installAgent_1 = require("./lib/installAgent");
const backup_1 = require("./lib/backup");
const VERSION = [0, 1, 0];
const mkdirPromise = util_1.promisify(fs_1.mkdir);
program.version(VERSION.join('.'))
    .option('--apikey <apikey>', '[REQUIRED] DBacked API key (can also be provided with the DBACKED_APIKEY env variable)')
    .option('--db-type <dbType>', '[REQUIRED] Database type (pg or mysql) (env variable: DBACKED_DB_TYPE)')
    .option('--db-host <dbHost>', '[REQUIRED] Database host (env variable: DBACKED_DB_HOST)')
    .option('--db-username <dbUsername>', '[REQUIRED] Database username (env variable: DBACKED_DB_USERNAME)')
    .option('--db-password <dbPassword>', '[REQUIRED] Database password (env variable: DBACKED_DB_PASSWORD)')
    .option('--db-name <dbName>', '[REQUIRED] Database name (env variable: DBACKED_DB_NAME)')
    .option('--public-key <publicKey>', 'Public key linked to the project (env variable: DBACKED_PUBLIC_KEY)')
    .option('--config-directory <directory>', 'Directory where the agent id and others files are stored, default /etc/dbacked')
    .option('--daemon', 'Detach the process as a daemon, will check if another daemon is not already started')
    .option('--daemon-name <name>', 'Allows multiple daemons to be started at the same time under different names');
let initCalled = false;
program.command('init')
    .option('--no-interactive', 'Disable the questions and directly read responses in the config file: /etc/dbacked/config.json')
    .action((cmd) => {
    // Cannot do anything else because of this issue https://github.com/tj/commander.js/issues/729
    initCalled = true;
    installAgent_1.installAgent(cmd);
});
let config;
async function main() {
    // TODO: block exec as root: https://github.com/sindresorhus/sudo-block#api
    if (initCalled) {
        return;
    }
    config = await config_1.getAndCheckConfig(program);
    log_1.default.info('Agent id:', { agentId: config.agentId });
    dbackedApi_1.registerApiKey(config.apikey);
    // Used to test the apiKey before daemonizing
    // TODO: if ECONREFUSED, try again 5 minutes later
    await dbackedApi_1.getProject();
    downgradeRoot();
    if (program.daemon) {
        const daemonName = program.daemonName ? `dbacked_${program.daemonName}` : 'dbacked';
        const lockDir = `/tmp/${daemonName}`;
        try {
            await mkdirPromise(lockDir);
        }
        catch (e) { }
        // TODO check version of daemonized process and kill it if different
        if (await lockfile.check(lockDir)) {
            log_1.default.error('A daemon is already running, use the --daemon-name params if you need to launch it multiple time');
            process.exit(1);
        }
        daemon();
        await lockfile.lock(lockDir);
    }
    while (true) {
        try {
            await backup_1.backupDatabase(config, VERSION);
            await delay_1.delay(5 * 60 * 1000);
        }
        catch (e) {
            await delay_1.delay(60 * 60 * 1000); // Delay for an hour if got an error
        }
    }
}
process.on('uncaughtException', (e) => {
    console.error('UNCAUGHT EXCEPTION');
    console.error(e);
    // reportErrorSync({
    //   backup,
    //   e,
    //   agentId: config.agentId,
    //   apikey: config.apikey,
    // });
    process.exit(1);
});
program.parse(process.argv);
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=index.js.map