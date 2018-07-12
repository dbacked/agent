import { spawn } from 'child_process';
import { resolve } from 'path';

import { Config } from './config';

export const restoreDb = async (stream, config: Config) => {
  const args = {
    pg: () => {
      const pgArgs = [
        '-U', config.dbUsername, '-h', config.dbHost,
        '-d', config.dbName,
      ];
      if (!config.dbPassword) {
        pgArgs.push('--no-password');
      }
      return pgArgs;
    },
    mysql: () => {
      const mysqlArgs = [
        '-u', config.dbUsername, '-h', config.dbHost,
      ];
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
      if (config.dbPassword) {
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


  const restoreProcess = await spawn(
    resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`, 'restore'),
    args,
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        PGPASSWORD: config.dbPassword,
        LD_LIBRARY_PATH: resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`),
      },
    },
  );
  stream.pipe(restoreProcess.stdin);
  await new Promise((resolvePromise, reject) => {
    restoreProcess.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(restoreProcess.stderr.read().toString()));
      }
    });
  });
};
