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
  let args;
  if (config.dbType === 'pg') {
    args = [
      '-U', config.dbUsername, '-h', config.dbHost,
      '-Z', '7', '--format=c',
      config.dbName,
    ];
  } else if (config.dbType === 'mysql') {
    args = [
      '-u', config.dbUsername, '-h', config.dbHost,
      '-C', '--single-transaction', `--password=${config.dbPassword}`,
      config.dbName,
    ];
  }
  const iv = await randomBytesPromise(128 / 8);
  const cipher = createCipheriv('aes256', backupKey, iv);
  const dumpProcess = await spawn(
    resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`, 'dump'),
    args,
    {
      stdio: 'pipe',
      env: {
        PGPASSWORD: config.dbPassword,
        LD_LIBRARY_PATH: resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`),
      },
    },
  );
  logger.debug('Started dump process');

  await waitForProcessStart(dumpProcess);
  logger.debug('Dump process started');

  dumpProcess.stdout.pipe(cipher);
  logger.debug('Piped to cipher');
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

