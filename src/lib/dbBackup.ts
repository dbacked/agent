import { spawn } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';
import { createCipheriv, randomBytes, publicEncrypt } from 'crypto';

import logger from './log';
import { Config } from './config';
import { waitForProcessStart } from './waitForProcessStart';

const randomBytesPromise = promisify(randomBytes);

export const startBackup = async (backupKey, config: Config) => {
  logger.debug('Starting dump');
  const args = [
    '-U', config.dbUsername, '-h', config.dbHost,
    '-Z', '7', '--format=c',
    config.dbName,
  ];
  const dumpProcess = await spawn(resolve(config.configDirectory, `${config.dbType}_dump`), args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  dumpProcess.stdin.write(config.dbPassword);
  dumpProcess.stdin.write('\n');
  dumpProcess.stdin.end();

  await waitForProcessStart(dumpProcess);

  const iv = await randomBytesPromise(128 / 8);
  const cipher = createCipheriv('aes256', backupKey, iv);
  dumpProcess.stdout.pipe(cipher);
  return {
    backupStream: cipher,
    iv,
  };
};

export const createBackupKey = async (publicKey) => {
  logger.debug('Creating AES key');
  const key = await randomBytesPromise(256 / 8);
  logger.debug('Encrypting AES key with RSA public key');
  const encryptedKey = publicEncrypt(publicKey, key);
  logger.debug('Generated encrypted AES key');
  return { key, encryptedKey };
};

