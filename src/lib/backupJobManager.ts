import { fork } from 'child_process';
import { resolve } from 'path';

export const startDatabaseBackupJob = (config, backupInfo) => {
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
          reject(new Error(payload));
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

