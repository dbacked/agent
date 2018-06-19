import { DbError } from './error';
import logger from './log';
import { ChildProcess } from 'child_process';


export const waitForProcessStart = (childProcess: ChildProcess) => {
  return new Promise((resolve, reject) => {
    let processStderr = '';
    logger.debug('Listening on dump process stderr');
    childProcess.stderr.addListener('data', (data) => { processStderr += data; });
    logger.debug('Listening on dump process close event');
    childProcess.addListener('close', (code) => {
      logger.debug('Child process close event fired', { code });
      if (code !== 0) {
        reject(new DbError(processStderr));
      }
    });
    logger.debug('Listening on dump process readable event');
    const waitForReadable = () => {
      logger.debug('Child process readable event fired');
      if (childProcess.stdout.readableLength) {
        logger.debug('Child process readableLength is > 0', { readableLength: childProcess.stdout.readableLength });
        childProcess.stdout.removeListener('readable', waitForReadable);
        resolve();
      }
    };
    childProcess.stdout.addListener('readable', waitForReadable);
  });
};

