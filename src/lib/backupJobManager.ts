import { fork } from 'child_process';
import { resolve } from 'path';
import * as daemon from 'daemonize-process';
import * as lockfile from 'proper-lockfile';
import { mkdir } from 'fs';
import { promisify } from 'util';
import * as downgradeRoot from 'downgrade-root';

import { reportError, waitForNextBackupNeededFromAPI } from './dbackedApi';
import { delay } from './delay';
import logger from './log';
import { getConfig, SUBSCRIPTION_TYPE } from './config';
import { initDatabase, waitForNextBackupNeededFromDatabase } from './dbStats';

export const startDatabaseBackupJob = (config, backupInfo = {}) => {
  return new Promise((resolvePromise, reject) => {
    const runner = fork(resolve(__dirname, './backupRunner.js'));
    runner.send(JSON.stringify({
      type: 'startBackup',
      payload: {
        config,
        backupInfo,
      },
    }));
    let errorMessageReceived = false;
    runner.on('message', (message) => {
      try {
        const { type, payload } = JSON.parse(message);
        if (type === 'error') {
          errorMessageReceived = true;
          reject(payload);
        }
      } catch (e) {}
    });
    runner.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else if (!errorMessageReceived) {
        reject(new Error('Backup worker exited with an unknown error'));
      }
    });
  });
};

const mkdirPromise = promisify(mkdir);

export const agentLoop = async (commandLineArgs) => {
  const config = await getConfig(commandLineArgs);

  logger.info('Agent id:', { agentId: config.agentId });

  // Daemonize process if needed
  if (config.daemon) {
    const daemonName = config.daemonName ? `dbacked_${config.daemonName}` : 'dbacked';
    const lockDir = `/tmp/${daemonName}`;
    try {
      await mkdirPromise(lockDir);
    } catch (e) {}
    // TODO check version of daemonized process and kill it if different
    if (await lockfile.check(lockDir)) {
      logger.error('A daemon is already running, use the --daemon-name params if you need to launch it multiple time');
      process.exit(1);
    }
    daemon();
    await lockfile.lock(lockDir);
  }
  downgradeRoot();

  if (config.subscriptionType === SUBSCRIPTION_TYPE.free) {
    await initDatabase(config.dbType, config);
  }

  // Main loop, blocking until a backup is needed
  while (true) {
    let backupInfo;
    try {
      logger.debug('Waiting for backup job');
      if (config.subscriptionType === SUBSCRIPTION_TYPE.premium) {
        backupInfo = await waitForNextBackupNeededFromAPI(config);
        logger.debug('Got backup job');
        await startDatabaseBackupJob(config, backupInfo);
      } else if (config.subscriptionType === SUBSCRIPTION_TYPE.free) {
        await waitForNextBackupNeededFromDatabase(config);
        logger.debug('Got backup job');
        await startDatabaseBackupJob(config);
      }
      await delay(5 * 1000);
    } catch (e) {
      logger.error('Error while backuping', { e });
      if (backupInfo) {
        await reportError({
          backup: backupInfo.backup,
          e,
          agentId: config.agentId,
        });
      }
      await delay(60 * 60 * 1000); // Delay for an hour if got an error
    }
  }
};
