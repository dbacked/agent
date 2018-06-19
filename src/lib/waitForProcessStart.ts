import { DbError } from './error';
import logger from './log';


export const waitForProcessStart = (childProcess) => {
  return new Promise((resolve, reject) => {
    let processStderr = '';
    logger.debug('Listening on dump process stderr');
    childProcess.stderr.on('data', (data) => { processStderr += data; });
    logger.debug('Listening on dump process close event');
    childProcess.on('close', (code) => {
      logger.debug('Child process close event fired', { code });
      if (code !== 0) {
        reject(new DbError(processStderr));
      }
    });
    logger.debug('Listening on dump process readable event');
    childProcess.stdout.once('readable', () => {
      logger.debug('Child process readable event fired');
      if (childProcess.stdout.readableLength) {
        logger.debug('Child process readableLength is > 0', { readableLength: childProcess.stdout.readableLength });
        resolve();
      }
    });
  });
};

