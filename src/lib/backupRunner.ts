import { createHash } from 'crypto';
import * as MultiStream from 'multistream';
import { PassThrough } from 'stream';

import { getProject, registerApiKey, getUploadPartUrl, finishUpload } from './dbackedApi';
import logger from './log';
import { checkDbDumpProgram } from './dbDumpProgram';
import { startDumper, createBackupKey } from './dbDumper';
import { uploadToS3 } from './s3';
import { createReadStream } from './streamHelpers';
import { VERSION } from './constants';

let backup;

logger.debug('Backup worker starting');
export const backupDatabase = async (config, backupInfo) => {
  try {
    registerApiKey(config.apikey);
    // Used to test the apiKey before daemonizing
    // TODO: if ECONREFUSED, try again 5 minutes later
    const project = await getProject();
    if (!config.publicKey) {
      config.publicKey = project.publicKey;
    }
    backup = backupInfo.backup;
    // TODO test for mysql
    await checkDbDumpProgram(config.dbType, config.dumpProgramsDirectory);
    const hash = createHash('md5');

    const { key: backupKey, encryptedKey } = await createBackupKey(config.publicKey);
    const { backupStream, iv } = await startDumper(backupKey, config);

    logger.debug('Creating backup file stream PassThrough');
    const backupFileStream = new PassThrough({
      highWaterMark: 201 * 1024 * 1024, // this is the max chunk size + 1MB
    });
    backupFileStream.write(Buffer.from('DBACKED'));
    backupFileStream.write(Buffer.from([...VERSION]));
    backupFileStream.write(Buffer.from(<ArrayBuffer>(new Uint32Array([encryptedKey.length])).buffer));
    backupFileStream.write(encryptedKey);
    backupFileStream.write(iv);
    backupStream.pipe(backupFileStream);
    // Need a passthrough because else the stream is just consumed by the hash
    const uploadingStream = new PassThrough({
      highWaterMark: 201 * 1024 * 1024, // this is the max chunk size + 1MB
    });
    backupFileStream.pipe(uploadingStream);
    backupFileStream.pipe(hash);

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
      backup,
      partsEtag,
      hash: (<any>hash.read()).toString('hex'),
      agentId: config.agentId,
      publicKey: config.publicKey,
    });
    logger.info('backup finished !');
    process.exit(0);
  } catch (e) {
    logger.error('Unknown error while creating backup', { error: e.code || (e.response && e.response.data) || e.message });
    process.send(JSON.stringify({
      type: 'error',
      payload: `${JSON.stringify(e.code || (e.response && e.response.data) || e.message)}\n${e.stack}`,
    }));
  }
};

process.on('message', (message) => {
  try {
    const { type, payload } = JSON.parse(message);
    if (type === 'startBackup') {
      backupDatabase(payload.config, payload.backupInfo);
    }
  } catch (e) {}
});

process.on('uncaughtException', (e) => {
  console.error(e);
  const error = <any>e;
  process.send(JSON.stringify({
    type: 'error',
    payload: `${error.code || (error.response && error.responserror.data) || error.message}\n${error.stack}`,
  }));
  process.exit(1);
});
