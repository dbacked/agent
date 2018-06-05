import { DbError } from './error';


export const waitForProcessStart = (childProcess) => {
  return new Promise((resolve, reject) => {
    let processStderr = '';
    childProcess.stderr.on('data', (data) => { processStderr += data; });
    childProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new DbError(processStderr));
      }
    });
    childProcess.stdout.once('readable', () => {
      if (childProcess.stdout.readableLength) {
        resolve();
      }
    });
  });
};

