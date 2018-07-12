import { spawn } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';
import { createCipheriv, randomBytes, publicEncrypt } from 'crypto';

import logger from './log';
import { Config } from './config';
import { waitForProcessStart } from './waitForProcessStart';
import { createGzip } from 'zlib';

const randomBytesPromise = promisify(randomBytes);

export const startDumper = async (backupKey, config: Config) => {
  logger.debug('Starting dump');

  const args = {
    pg: () => {
      const pgArgs = [
        '-h', config.dbHost,
        '--format=c',
      ];
      if (config.dbUsername) {
        pgArgs.push('-U');
        pgArgs.push(config.dbUsername);
      }
      if (!config.dbPassword) {
        pgArgs.push('--no-password');
      }
      pgArgs.push(config.dbName);
      return pgArgs;
    },
    mysql: () => {
      const mysqlArgs = [
        '-h', config.dbHost,
        '-C', '--single-transaction',
      ];
      if (config.dbUsername) {
        mysqlArgs.push('-u');
        mysqlArgs.push(config.dbUsername);
      }
      if (config.dbPassword) {
        mysqlArgs.push(`--password=${config.dbPassword}`);
      }
      mysqlArgs.push(config.dbName);
      return mysqlArgs;
    },
    mongodb: () => {
      const mongodbArgs = [
        '--host', config.dbHost,
        '--archive',
      ];
      if (config.dbName) {
        mongodbArgs.push('--db');
        mongodbArgs.push(config.dbName);
      }
      if (config.dbUsername && config.dbPassword && config.authenticationDatabase) {
        mongodbArgs.push('--username');
        mongodbArgs.push(config.dbUsername);
        mongodbArgs.push('--password');
        mongodbArgs.push(config.dbPassword);
        mongodbArgs.push('--authenticationDatabase');
        mongodbArgs.push(config.authenticationDatabase);
      }
      return mongodbArgs;
    },
  }[config.dbType]();

  const iv = await randomBytesPromise(128 / 8);
  const cipher = createCipheriv('aes256', backupKey, iv);
  const dumpProcess = await spawn(
    resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`, 'dump'),
    args,
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PGPASSWORD: config.dbPassword,
        LD_LIBRARY_PATH: resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`),
      },
    },
  );
  logger.debug('Started dump process');

  dumpProcess.on('close', (code) => {
    logger.debug('Dumper closed', { code });
  });

  await waitForProcessStart(dumpProcess);
  logger.debug('Dump process started');
  const gzip = createGzip();
  dumpProcess.stdout.pipe(gzip);
  gzip.pipe(cipher);
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

