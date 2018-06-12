import * as program from 'commander';
import { resolve } from 'path';
import { createHash } from 'crypto';
import * as MultiStream from 'multistream';
import { PassThrough } from 'stream';
import * as daemon from 'daemonize-process';
import * as lockfile from 'proper-lockfile';
import { mkdir } from 'fs';
import { promisify } from 'util';

import assertExit from './lib/assertExit';
import { getProject, registerApiKey, createBackup, getUploadPartUrl, finishUpload, reportError } from './lib/dbackedApi';
import { delay } from './lib/delay';
import { getOrGenerateAgentId } from './lib/agentId';
import logger from './lib/log';
import { checkDbDumpProgram } from './lib/dbDumpProgram';
import { DB_TYPE, Config } from './lib/config';
import { startBackup, createBackupKey } from './lib/dbBackup';
import { uploadToS3 } from './lib/s3';
import { createReadStream } from './lib/streamHelpers';

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
  .option('--config-directory <directory>', 'Directory where the agent id and others files are stored, default $HOME/.dbacked')
  .option('--daemon', 'Detach the process as a daemon, will check if another daemon is not already started')
  .option('--daemon-name <name>', 'Allows multiple daemons to be started at the same time under different names')
  .parse(process.argv);

const config: Config = {
  apikey: program.apikey || process.env.DBACKED_APIKEY,
  publicKey: program.publicKey || process.env.DBACKED_PUBLIC_KEY,
  dbType: program.dbType || process.env.DBACKED_DB_TYPE,
  dbHost: program.dbHost || process.env.DBACKED_DB_HOST,
  dbUsername: program.dbUsername || process.env.DBACKED_DB_USERNAME,
  dbPassword: program.dbPassword || process.env.DBACKED_DB_PASSWORD,
  dbName: program.dbName || process.env.DBACKED_DB_NAME,
  configDirectory: program.configDirectory || resolve(
    process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'],
    '.dbacked',
  ),
};

assertExit(config.apikey && config.apikey.length, '--apikey is required');
assertExit(config.dbType && config.dbType.length, '--db-type is required');
assertExit(DB_TYPE[config.dbType], '--db-type should be pg or mysql');
assertExit(config.dbHost && config.dbHost.length, '--db-host is required');
assertExit(config.dbUsername && config.dbUsername.length, '--db-username is required');
assertExit(config.dbPassword && config.dbPassword.length, '--db-password is required');
assertExit(config.dbName && config.dbName.length, '--db-name is required');

if (!config.publicKey) {
  logger.warn('You didn\'t provide your public key via the --public-key or env varible DBACKED_PUBLIC_KEY, this could expose you to a man in the middle attack on your backups');
}

async function main() {
  const agentId = await getOrGenerateAgentId({ directory: config.configDirectory });
  logger.info('Agent id:', { agentId });
  registerApiKey(config.apikey);
  // Used to test the apiKey before daemonizing
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
  let backup;
  while (true) {
    const project = await getProject();
    if (!config.publicKey) {
      config.publicKey = project.publicKey;
    }
    try {
      const backupInfo = await createBackup({
        agentId,
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
      // need to align to 4 so prepending 0 to version buffer
      const versionStream = createReadStream(Buffer.from([...VERSION]));
      const encryptedKeyLengthStream = createReadStream(Buffer.from(<ArrayBuffer>(new Uint32Array([encryptedKey.length])).buffer));
      const encryptedKeyStream = createReadStream(encryptedKey);
      const ivStream = createReadStream(iv);
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
            backup, partNumber, agentId, hash: partHash,
          });
          return partUploadUrl;
        },
      });
      logger.info('Informing server the upload is finished');
      hash.end();
      await finishUpload({
        backup, partsEtag, hash: hash.digest('base64'), agentId,
      });
      logger.info('backup finished !');
      backup = undefined;
    } catch (e) {
      if (e.response && e.response.data && e.response.data.message === 'No backup needed for the moment') {
        logger.info('No backup needed, waiting 5 minutes');
      } else {
        if (backup) {
          await reportError({ backup, error: e.code || (e.response && e.response.data) || e.message, agentId });
        }
        logger.error('Unknown error while creating backup, waiting 5 minutes', { error: e.code || (e.response && e.response.data) || e.message });
      }
    }
    await delay(5 * 60 * 1000);
  }
}

main();
