"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
if (process.env.DEBUG_MODE) {
    const longjohn = require('longjohn');
    longjohn.async_trace_limit = -1;
}
const yargs = __importStar(require("yargs"));
const constants_1 = require("./lib/constants");
const backupJobManager_1 = require("./lib/backupJobManager");
const installAgent_1 = require("./lib/installAgent");
const restoreBackup_1 = require("./lib/restoreBackup");
yargs
    .option('apikey', { string: true, describe: 'DBacked API key (can also be provided with the DBACKED_APIKEY env variable) [Optionnal]', })
    .option('db-type', { string: true, desc: 'Database type (pg or mysql or mongodb) (env variable: DBACKED_DB_TYPE)', })
    .option('db-host', { string: true, desc: 'Database host (env variable: DBACKED_DB_HOST)', })
    .option('db-username', { string: true, desc: 'Database username (env variable: DBACKED_DB_USERNAME)', })
    .option('db-password', { string: true, desc: 'Database password (env variable: DBACKED_DB_PASSWORD)', })
    .option('db-name', { string: true, desc: 'Database name (env variable: DBACKED_DB_NAME)', })
    .option('authentication-database', { string: true, desc: 'MongoDB only: Specifies the database in which the user is created (env variable: DBACKED_AUTHENTICATION_DATABASE)', })
    .option('config-directory', { string: true, desc: 'Directory where the agent id and others files are stored, default /etc/dbacked', })
    .option('public-key', {
    string: true, desc: 'Public key linked to the project (env variable: DBACKED_PUBLIC_KEY)',
})
    .command('install-agent', 'Install the backup agent on the server', commandYargs => commandYargs.option('y', {
    describe: 'Disable the questions and use command line args, environment variable and config file',
    boolean: true,
}), installAgent_1.installAgent)
    .command('start-agent', 'Start the backup agent', commandYargs => commandYargs
    .option('daemon', { boolean: true, desc: 'Detach the process as a daemon, will check if another daemon is not already started', })
    .option('daemon-name', { string: true, desc: 'Allows multiple daemons to be started at the same time under different names', }), backupJobManager_1.agentLoop)
    .command('restore', 'Restore a backup from DBacked into a database accessible from this host', commandYargs => commandYargs
    .option('raw-output', { boolean: true, desc: 'Output the unencrypted backup on stdout instead of restoring it directly', })
    .option('raw-input', { boolean: true, desc: 'Get the encrypted backup form stdin instead of getting it from DBacked service', })
    .option('last-backup', { boolean: true, desc: 'Do not ask which backup to restore, use last one', })
    .option('private-key-path', { string: true, desc: 'Private key path, private key can also be provided by DBACKED_PRIVATE_KEY env variable', })
    .option('y', { boolean: true, desc: 'Do not ask question and use only config file or env variables', })
    .option('force', { boolean: true, desc: "Don't ask for confirmation before restoring", }), restoreBackup_1.restoreBackup)
    .demandCommand()
    .version(constants_1.VERSION.join('.'))
    .strict()
    .parse();
// TODO: add a command to start a backup right now
process.on('unhandledRejection', (e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=index.js.map