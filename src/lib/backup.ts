import { createHash } from 'crypto';
import * as MultiStream from 'multistream';
import { PassThrough } from 'stream';

import { getProject, registerApiKey, createBackup, getUploadPartUrl, finishUpload } from './dbackedApi';
import logger from './log';
import { checkDbDumpProgram } from './dbDumpProgram';
import { startBackup, createBackupKey } from './dbBackup';
import { uploadToS3 } from './s3';
import { createReadStream } from './streamHelpers';
import { reportErrorSync } from './reportError';

let backup;

export const backupDatabase = async (config, VERSION) => {
  registerApiKey(config.apikey);
  // Used to test the apiKey before daemonizing
  // TODO: if ECONREFUSED, try again 5 minutes later
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
    await checkDbDumpProgram(config.dbType, config.dumpProgramsDirectory);
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
};
