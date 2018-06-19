if (process.env.DEBUG_MODE) {
  const longjohn = require('longjohn');
  longjohn.async_trace_limit = -1;
}

import * as program from 'commander';
import { createHash } from 'crypto';
import * as MultiStream from 'multistream';
import { PassThrough } from 'stream';
import * as daemon from 'daemonize-process';
import * as lockfile from 'proper-lockfile';
import { mkdir } from 'fs';
import { promisify } from 'util';

import { getProject, registerApiKey, createBackup, getUploadPartUrl, finishUpload } from './lib/dbackedApi';
import { delay } from './lib/delay';
import logger from './lib/log';
import { checkDbDumpProgram } from './lib/dbDumpProgram';
import { getAndCheckConfig } from './lib/config';
import { startBackup, createBackupKey } from './lib/dbBackup';
import { uploadToS3 } from './lib/s3';
import { createReadStream } from './lib/streamHelpers';
import { installAgent } from './lib/installAgent';
import { reportErrorSync } from './lib/reportError';

const VERSION = [0, 0, 1];
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

let backup;
let config;
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
    const project = await getProject();
    if (!config.publicKey) {
      config.publicKey = project.publicKey;
    }
    try {
      const backupInfo = await createBackup({
        agentId: config.agentId,
        agentVersion: VERSION.join('.'),
        publicKey: config.publicKey,
        dbType: config.dbType,
      });
      backup = backupInfo.backup;
      // TODO test for mysql
      await checkDbDumpProgram(config.dbType, config.configDirectory);
      const hash = createHash('md5');

      const { key: backupKey, encryptedKey } = await createBackupKey(config.publicKey);
      const { backupStream, iv } = await startBackup(backupKey, config);

      const magicStream = createReadStream(Buffer.from('DBACKED'));
      const versionStream = createReadStream(Buffer.from([...VERSION]));
      const encryptedKeyLengthStream = createReadStream(Buffer.from(<ArrayBuffer>(new Uint32Array([encryptedKey.length])).buffer));
      const encryptedKeyStream = createReadStream(encryptedKey);
      const ivStream = createReadStream(iv);
      logger.debug('Creating multistream');
      const backupFileStream = MultiStream([
        magicStream,
        versionStream,
        encryptedKeyLengthStream,
        encryptedKeyStream,
        ivStream,
        backupStream,
      ]);
      // Need a passthrough because else the stream is just consumed by the hash
      const uploadingStream = new PassThrough();
      backupFileStream.pipe(hash);
      backupFileStream.pipe(uploadingStream);

      const partsEtag = await uploadToS3({
        fileStream: uploadingStream,
        generateBackupUrl: async ({ partNumber, partHash }) => {
          logger.debug('Getting multipart upload URL for part number', { partNumber });
          const { partUploadUrl } = await getUploadPartUrl({
            backup, partNumber, agentId: config.agentId, hash: partHash,
          });
          return partUploadUrl;
        },
      });
      logger.info('Informing server the upload is finished');
      hash.end();
      await finishUpload({
        backup, partsEtag, hash: hash.digest('base64'), agentId: config.agentId,
      });
      logger.info('backup finished !');
      backup = undefined;
    } catch (e) {
      if (e.response && e.response.data && e.response.data.message === 'No backup needed for the moment') {
        logger.info('No backup needed, waiting 5 minutes');
      } else {
        if (backup) {
          await reportErrorSync({
            backup,
            e,
            agentId: config.agentId,
            apikey: config.apikey,
          });
        }
        logger.error('Unknown error while creating backup, waiting 5 minutes', { error: e.code || (e.response && e.response.data) || e.message });
      }
    }
    await delay(5 * 60 * 1000);
  }
}

process.on('uncaughtException', (e) => {
  console.error('UNCAUGHT EXCEPTION');
  console.error(e);
  reportErrorSync({
    backup,
    e,
    agentId: config.agentId,
    apikey: config.apikey,
  });
  process.exit(1);
});

program.parse(process.argv);
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
