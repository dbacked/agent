import { prompt } from 'inquirer';
import { DateTime } from 'luxon';
import Axios from 'axios';
import { PromiseReadable } from 'promise-readable';
import { pki } from 'node-forge';

import { getConfig, askForConfig } from './config';
import { getProject, registerApiKey, getBackupDownloadUrl } from './dbackedApi';
import logger from './log';
import { formatBytes } from './helpers';
import assertExit from './assertExit';
import { readFilePromisified } from './fs';
import { privateDecrypt, createDecipheriv } from 'crypto';
import { createGunzip } from 'zlib';
import { checkDbDumpProgram } from './dbDumpProgram';
import { restoreDb } from './dbRestoreProgram';

const getBackupToRestore = async (config, { useLastBackup }) => {
  registerApiKey(config.apikey);
  const project = await getProject();
  const availableBackups = project.backups.filter(({ finishedAt }) => !!finishedAt);
  if (!availableBackups.length) {
    logger.error('No backup available for this project');
    process.exit(1);
  }
  if (useLastBackup) {
    return project.backups[0];
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
  return backup;
};

const getBackupStream = async (config, { useLastBackup, useStdin }) => {
  if (useStdin) {
    return process.stdin;
  }
  const backup = await getBackupToRestore(config, { useLastBackup });
  const backupDownloadUrl = await getBackupDownloadUrl(backup);
  const { data } = await Axios({
    method: 'get',
    url: backupDownloadUrl,
    responseType: 'stream',
  });
  return data;
};

const decryptAesKey = async (commandLine, encryptedAesKey) => {
  let privateKey;
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
  if (privateKey.split('\n')[1] === 'Proc-Type: 4,ENCRYPTED') {
    const { passphrase } = <any> await prompt([{
      type: 'input',
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
  const config = await getConfig(commandLine);
  if (!commandLine.y) {
    Object.assign(config, await askForConfig(config));
  }

  const backupStream = await getBackupStream(config, {
    useLastBackup: commandLine.lastBackup,
    useStdin: commandLine.rawInput,
  });
  const promisifiedBackupStream = new PromiseReadable(backupStream);
  assertExit((await promisifiedBackupStream.read(7)).toString() === 'DBACKED', 'Invalid start of file, check for file corruption');
  const version = [...(await promisifiedBackupStream.read(3))]; // eslint-disable-line
  const aesKeyLengthBuffer = <Buffer>(await promisifiedBackupStream.read(4));
  const [aesKeyLength] = new Uint32Array(aesKeyLengthBuffer.buffer.slice(
    aesKeyLengthBuffer.byteOffset,
    aesKeyLengthBuffer.byteOffset + 4,
  ));
  const encryptedAesKey = <Buffer> await promisifiedBackupStream.read(aesKeyLength);
  assertExit(encryptedAesKey && encryptedAesKey.length === aesKeyLength, 'File ends before reading aes key, no aes key header, is file truncated?');
  const decryptedAesKey = await decryptAesKey(commandLine, encryptedAesKey);
  const iv = <Buffer> await promisifiedBackupStream.read(16);
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
        message: `Do you really want to restore the backup on database ${config.dbName} on host ${config.dbHost}`,
      }]);
      assertExit(confirm, 'No confirmation, exiting...');
    }
    await checkDbDumpProgram(config.dbType, config.dumpProgramsDirectory);
    await restoreDb(gunzip, config);
    console.log('Restored !');
  }
};
