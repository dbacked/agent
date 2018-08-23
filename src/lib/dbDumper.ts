import { spawn } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';
import { createCipheriv, randomBytes, publicEncrypt } from 'crypto';

import logger from './log';
import { Config } from './config';
import { waitForProcessStart, createProcessWatcher } from './childProcessHelpers';
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
      // TODO: add additionnal flags from config
      pgArgs.push(config.dbName);
      return pgArgs;
    },
    mysql: () => {
      const mysqlArgs = [
        '-h', config.dbHost,
        '-C', '--single-transaction',
        '--column-statistics=0', // https://serverfault.com/questions/912162/mysqldump-throws-unknown-table-column-statistics-in-information-schema-1109
      ];
      if (config.dbUsername) {
        mysqlArgs.push('-u');
        mysqlArgs.push(config.dbUsername);
      }
      if (config.dbPassword) {
        mysqlArgs.push(`--password=${config.dbPassword}`);
      }
      // TODO: add additionnal flags from config
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
      if (config.dbUsername && config.dbPassword) {
        mongodbArgs.push('--username');
        mongodbArgs.push(config.dbUsername);
        mongodbArgs.push('--password');
        mongodbArgs.push(config.dbPassword);
      }
      // TODO: add additionnal flags from config
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
  const processWatcher = await createProcessWatcher(dumpProcess);
  logger.debug('Started dump process');

  dumpProcess.on('close', (code) => {
    logger.debug('Dumper closed', { code });
  });

  await processWatcher.waitForStdoutStart();
  logger.debug('Dump process started');
  const gzip = createGzip();
  dumpProcess.stdout.pipe(gzip);
  gzip.pipe(cipher);
  logger.debug('Piped to cipher');
  return {
    backupStream: cipher,
    iv,
    processWatcher,
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

