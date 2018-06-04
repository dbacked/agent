import * as program from 'commander';
import { resolve } from 'path';

import assertExit from './lib/assertExit';
import { getProject, registerApiKey, createBackup, getUploadPartUrl, finishUpload } from './lib/dbackedApi';
import { delay } from './lib/delay';
import { getOrGenerateAgentId } from './lib/agentId';
import logger from './lib/log';
import { checkDbDumpProgram } from './lib/dbDumpProgram';
import { DB_TYPE, Config } from './lib/config';
import { startBackup, createBackupKey } from './lib/dbBackup';
import { PassThrough } from 'stream';
import Axios from 'axios';
import { uploadToS3 } from './lib/s3';

program.version('0.0.1')
  .option('--apikey <apikey>', 'DBacked API key (can also be provided with the DBACKED_APIKEY env variable)')
  .option('--public-key <publicKey>', 'Public key linked to the project (env variable: DBACKED_PUBLIC_KEY)')
  .option('--db-type <dbType>', 'Database type (pg or mysql) (env variable: DBACKED_DB_TYPE)')
  .option('--db-host <dbHost>', 'Database host (env variable: DBACKED_DB_HOST)')
  .option('--db-username <dbUsername>', 'Database username (env variable: DBACKED_DB_USERNAME)')
  .option('--db-password <dbPassword>', 'Database password (env variable: DBACKED_DB_PASSWORD)')
  .option('--db-name <dbName>', 'Database name (env variable: DBACKED_DB_NAME)')
  .option('--config-directory <directory>', 'Directory where the agent id and others files are stored, default $HOME/.dbacked')
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

assertExit(config.apikey, '--apikey is required');
assertExit(config.publicKey, '--public-key is required');
assertExit(config.dbType, '--db-type is required');
assertExit(DB_TYPE[config.dbType], '--db-type should be pg or mysql');
assertExit(config.dbHost, '--db-host is required');
assertExit(config.dbUsername, '--db-username is required');
assertExit(config.dbPassword, '--db-password is required');
assertExit(config.dbName, '--db-name is required');

async function main() {
  const agentId = await getOrGenerateAgentId({ directory: config.configDirectory });
  registerApiKey(config.apikey);
  while (true) {
    const project = await getProject();
    try {
      const { backup, uploadId, firstPartUploadUrl } = await createBackup({ agentId });
      await checkDbDumpProgram(config.dbType, config.configDirectory);
      // const {stopJobReporting} =
      const backupFileStream = new PassThrough();
      const { key: backupKey, encryptedKey } = await createBackupKey(config.publicKey);
      backupFileStream.write(encryptedKey);
      const backupStream = await startBackup(backupKey, config);
      backupStream.pipe(backupFileStream);
      const partsEtag = await uploadToS3({
        fileStream: backupFileStream,
        generateBackupUrl: async ({ partNumber }) => {
          logger.debug('Getting multipart upload URL for part number', { partNumber });
          if (partNumber === 1) {
            return firstPartUploadUrl;
          }
          return getUploadPartUrl(backup, partNumber);
        },
      });
      finishUpload(backup, partsEtag);
      // const data = await Axios({
      //   method: 'put',
      //   url: newBackup.uploadUrl,
      //   data: backupFileStream,
      //   headers: {
      //     'content-type': 'application/octet-stream',
      //   },
      // });
      // console.log(data);
    } catch (e) {
      if (e.response && e.response.data && e.response.data.status === 409) {
        logger.info('No backup needed, waiting 5 minutes');
      } else {
        console.log(e);
        logger.error('Unknown error while creating backup, waiting 5 minutes', { error: e.code || e.response || e });
      }
    }
    await delay(5 * 60 * 1000);
  }
}

main();
