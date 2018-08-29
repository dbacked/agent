import { prompt } from 'inquirer';
import { DateTime } from 'luxon';
import Axios from 'axios';
import { pki } from 'node-forge';

import { getConfig, Config, SUBSCRIPTION_TYPE } from './config';
import { getProject, getBackupDownloadUrl } from './dbackedApi';
import logger from './log';
import { formatBytes } from './helpers';
import assertExit from './assertExit';
import { readFilePromisified } from './fs';
import { privateDecrypt, createDecipheriv } from 'crypto';
import { createGunzip } from 'zlib';
import { checkDbDumpProgram } from './dbDumpProgram';
import { restoreDb } from './dbRestoreProgram';
import PromisifiedReadableStream from './streamToPromise';
import { getBackupNamesFromS3, getS3downloadUrl, getBackupMetadataFromS3 } from './s3';

const getAvailableBackups = async (config: Config) => {
  if (config.subscriptionType === SUBSCRIPTION_TYPE.pro) {
    const project = await getProject();
    const availableBackups = project.backups
      .filter(({ finishedAt }) => !!finishedAt);
    return availableBackups;
  } else if (config.subscriptionType === SUBSCRIPTION_TYPE.free) {
    const backupsName = await getBackupNamesFromS3(config);
    const backupsMetadata = await Promise.all(backupsName.map((backupName) =>
      getBackupMetadataFromS3(config, backupName)));
    return backupsMetadata
      .filter(Boolean)
      .sort((backup1, backup2) => backup2.timestamp - backup1.timestamp)
      .map(({
        dbType, timestamp, size, filename,
      }) => ({
        dbType,
        finishedAt: DateTime.fromMillis(timestamp).toISO(),
        size,
        filename,
      }));
  }
  return [];
};

const getTargetBackupDownloadUrl = async (config: Config, { useLastBackup }) => {
  const availableBackups = await getAvailableBackups(config);
  if (!availableBackups.length) {
    logger.error('No backup available for this project');
    process.exit(1);
  }
  if (useLastBackup) {
    return await getBackupDownloadUrl(availableBackups[0]);
  }
  const { backup } = <any> await prompt([{
    type: 'list',
    name: 'backup',
    message: 'Which backup to restore?',
    choices: availableBackups.map((backupChoice, i) => ({
      name: `${backupChoice.dbType} - ${DateTime.fromISO(backupChoice.finishedAt).toLocaleString(DateTime.DATETIME_MED)} - ${formatBytes(backupChoice.size)} ${i === 0 ? '- Last backup' : ''}`,
      value: backupChoice,
    })),
  }]);
  return config.subscriptionType === SUBSCRIPTION_TYPE.pro ?
    await getBackupDownloadUrl(backup) :
    await getS3downloadUrl(config, backup.filename);
};

const getBackupStream = async (config, { useLastBackup, useStdin }) => {
  if (useStdin) {
    return process.stdin;
  }
  const downloadUrl = await getTargetBackupDownloadUrl(config, { useLastBackup });
  const { data } = await Axios({
    method: 'get',
    url: downloadUrl,
    responseType: 'stream',
  });
  return data;
};

const decryptAesKey = async (commandLine, encryptedAesKey) => {
  let privateKey: string;
  if (commandLine.privateKeyPath) {
    try {
      privateKey = await readFilePromisified(commandLine.privateKeyPath, { encoding: 'utf-8' });
    } catch (e) {
      assertExit(false, `Couldn't read private key: ${e}`);
    }
  } else if (process.env.DBACKED_PRIVATE_KEY) {
    privateKey = process.env.DBACKED_PRIVATE_KEY;
  } else {
    assertExit(false, 'No private key was provided by --private-key-path or DBACKED_PRIVATE_KEY env');
  }
  if (privateKey.split('\n')[1].includes('Proc-Type: 4,ENCRYPTED') ||
    privateKey.split('\n')[0].includes('BEGIN ENCRYPTED PRIVATE KEY')
  ) {
    const { passphrase } = <any> await prompt([{
      type: 'password',
      name: 'passphrase',
      message: 'Private key passphrase',
    }]);
    try {
      const decryptedPrivateKey = pki.decryptRsaPrivateKey(privateKey, passphrase);
      assertExit(decryptedPrivateKey, 'Invalid passphrase');
      privateKey = pki.privateKeyToPem(decryptedPrivateKey);
    } catch (e) {
      console.error('Corrupted private key or invalid passphrase, try decrypting the key with openssl cli', e);
      process.exit(1);
    }
  }

  try {
    return privateDecrypt(privateKey, encryptedAesKey);
  } catch (e) {
    console.error('Invalid private key, please check that the downloaded backup is not corrupted and you have the right private key');
    process.exit(1);
  }
};

export const restoreBackup = async (commandLine) => {
  const config = await getConfig(commandLine, {
    interactive: !commandLine.y,
    filter: ({ meta }) => !meta || !meta.notForRestore,
  });

  const backupStream = await getBackupStream(config, {
    useLastBackup: commandLine.lastBackup,
    useStdin: commandLine.rawInput,
  });
  const promisifiedBackupStream = new PromisifiedReadableStream(backupStream);

  // Test Magic
  promisifiedBackupStream.setSize(7);
  assertExit((await promisifiedBackupStream.next()).value.toString() === 'DBACKED', 'Invalid start of file, check for file corruption');
  // Get version
  promisifiedBackupStream.setSize(3);
  const version = [...(await promisifiedBackupStream.next()).value]; // eslint-disable-line
  promisifiedBackupStream.setSize(4);
  // Get AES key length
  const aesKeyLengthBuffer = <Buffer>(await promisifiedBackupStream.next()).value;
  const [aesKeyLength] = new Uint32Array(aesKeyLengthBuffer.buffer.slice(
    aesKeyLengthBuffer.byteOffset,
    aesKeyLengthBuffer.byteOffset + 4,
  ));
  // Get AES key
  promisifiedBackupStream.setSize(aesKeyLength);
  const encryptedAesKey = <Buffer> (await promisifiedBackupStream.next()).value;
  assertExit(encryptedAesKey && encryptedAesKey.length === aesKeyLength, 'File ends before reading aes key, no aes key header, is file truncated?');
  const decryptedAesKey = await decryptAesKey(commandLine, encryptedAesKey);
  // Get IV
  promisifiedBackupStream.setSize(16);
  const iv = <Buffer> (await promisifiedBackupStream.next()).value;
  assertExit(iv && iv.length === 16, 'No IV header, is file truncated?');
  const decipher = createDecipheriv('aes256', decryptedAesKey, iv);

  backupStream.pipe(decipher);
  const gunzip = createGunzip();
  decipher.pipe(gunzip);
  if (commandLine.rawOutput) {
    gunzip.pipe(process.stdout);
  } else {
    if (!commandLine.force) {
      const { confirm } = <any> await prompt([{
        type: 'confirm',
        name: 'confirm',
        message: config.dbType === 'mongodb' ?
          `Do you really want to restore the backup on database ${config.dbConnectionString}` :
          `Do you really want to restore the backup on database ${config.dbName} on host ${config.dbHost}`,

      }]);
      assertExit(confirm, 'No confirmation, exiting...');
    }
    await checkDbDumpProgram(config.dbType, config.databaseToolsDirectory);
    console.log('Restoring backup... This can take a long time');
    await restoreDb(gunzip, config);
    console.log('Restored !');
  }
};
