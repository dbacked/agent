import { spawn } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';
import { createCipheriv, randomBytes, createHash, publicEncrypt } from 'crypto';
import { PassThrough } from 'stream';

import logger from './log';
import { waitForStreamEnd } from './fs';
import { Config } from './config';

const randomBytesPromise = promisify(randomBytes);
const publicEncryptPromise = promisify(publicEncrypt);

export const startBackup = async (backupKey, config: Config) => {
  const encryptedBackupOutput = new PassThrough();
  logger.debug('Starting dump');
  const args = [
    '-U', config.dbUsername, '-h', config.dbHost, '-Z', '7', '--format=c', config.dbName,
  ];
  const dumpProcess = await spawn(resolve(config.configDirectory, `${config.dbType}_dump`), args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  dumpProcess.stdin.write(config.dbPassword);
  dumpProcess.stdin.write('\n');
  dumpProcess.stdin.end();
  // const hash = createHash('md5');

  const iv = await randomBytesPromise(128 / 8);
  const cipher = createCipheriv('aes256', backupKey, iv);
  dumpProcess.stdout.pipe(cipher);
  encryptedBackupOutput.write(iv);
  cipher.pipe(encryptedBackupOutput);
  // cipher.pipe(hash);
  // await waitForStreamEnd(cipher);
  // logger.debug('This is done');
  // hash.end();
  // console.log(hash.digest('base64'));
  return encryptedBackupOutput;
};

export const createBackupKey = async (publicKey) => {
  logger.debug('Creating AES key');
  const key = await randomBytesPromise(256 / 8);
  logger.debug('Encrypting AES key with RSA public key');
  try {
    const encryptedKey = publicEncrypt(publicKey, key);
    logger.debug('Encrypted key');
    return { key, encryptedKey };
  } catch (e) {
    logger.error('Could\'nt encrypt key, please verify your public key');
    console.log(e);
  }
};

