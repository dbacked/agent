if (process.env.DEBUG_MODE) {
  const longjohn = require('longjohn');
  longjohn.async_trace_limit = -1;
}

import * as program from 'commander';
import * as daemon from 'daemonize-process';
import * as lockfile from 'proper-lockfile';
import { mkdir } from 'fs';
import { promisify } from 'util';
import * as downgradeRoot from 'downgrade-root';

import { getProject, registerApiKey, reportError, waitForBackup } from './lib/dbackedApi';
import { delay } from './lib/delay';
import logger from './lib/log';
import { getAndCheckConfig } from './lib/config';
import { installAgent } from './lib/installAgent';
import { VERSION } from './lib/constants';
import { startDatabaseBackupJob } from './lib/backupJobManager';

const mkdirPromise = promisify(mkdir);

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
    installAgent(cmd);
  });

let config;
let backupInfo;
async function main() {
  // TODO: block exec as root: https://github.com/sindresorhus/sudo-block#api
  if (initCalled) {
    return;
  }
  config = await getAndCheckConfig(program);

  logger.info('Agent id:', { agentId: config.agentId });
  registerApiKey(config.apikey);
  // Used to test the apiKey before daemonizing
  // TODO: if ECONREFUSED, try again 5 minutes later
  await getProject();
  downgradeRoot();
  if (program.daemon) {
    const daemonName = program.daemonName ? `dbacked_${program.daemonName}` : 'dbacked';
    const lockDir = `/tmp/${daemonName}`;
    try {
      await mkdirPromise(lockDir);
    } catch (e) {}
    // TODO check version of daemonized process and kill it if different
    if (await lockfile.check(lockDir)) {
      logger.error('A daemon is already running, use the --daemon-name params if you need to launch it multiple time');
      process.exit(1);
    }
    daemon();
    await lockfile.lock(lockDir);
  }
  while (true) {
    backupInfo = null;
    try {
      backupInfo = await waitForBackup(config);
      await startDatabaseBackupJob(config, backupInfo);
      await delay(5 * 1000);
    } catch (e) {
      await reportError({
        backup: backupInfo.backup,
        e,
        agentId: config.agentId,
      });
      await delay(60 * 60 * 1000); // Delay for an hour if got an error
    }
  }
}

process.on('uncaughtException', (e) => {
  console.error('Uncaught Error:');
  console.error(e);
  process.exit(1);
});

program.parse(process.argv);
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
