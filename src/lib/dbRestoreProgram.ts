import { spawn } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';

import logger from './log';
import { Config } from './config';
import { waitForProcessStart } from './waitForProcessStart';

export const restoreDb = async (stream, config: Config) => {
  let args;
  if (config.dbType === 'pg') {
    args = [
      '-U', config.dbUsername, '-h', config.dbHost,
      '-d', config.dbName,
    ];
    if (!config.dbPassword) {
      args.push('--no-password');
    }
  } else if (config.dbType === 'mysql') {
    args = [
      '-u', config.dbUsername, '-h', config.dbHost,
    ];
    if (config.dbPassword) {
      args.push(`--password=${config.dbPassword}`);
    }
    args.push(config.dbName);
  }
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
