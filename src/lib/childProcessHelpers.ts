import { DbError } from './error';
import logger from './log';
import { ChildProcess } from 'child_process';
import { delay } from './delay';

export const createProcessWatcher = async (childProcess: ChildProcess) => {
  let processStderr = '';
  childProcess.stderr.addListener('data', (data) => { processStderr += data; });
  const exitPromise = new Promise((resolve, reject) => {
    childProcess.addListener('close', (code) => {
      logger.debug('Child process close event fired', { code, processStderr });
      if (code === 0) {
        resolve(0);
      } else {
        reject(new DbError(processStderr));
      }
    });
  });
  const readablePromise = new Promise((resolve) => {
    const waitForReadable = () => {
      logger.debug('Child process readable event fired');
      if (childProcess.stdout.readableLength) {
        logger.debug('Child process readableLength is > 0', { readableLength: childProcess.stdout.readableLength });
        childProcess.stdout.removeListener('readable', waitForReadable);
        const readed = childProcess.stdout.read();
        childProcess.stdout.unshift(readed);
        resolve();
      }
    };
    childProcess.stdout.addListener('readable', waitForReadable);
  });

  return {
    waitForStdoutStart: async () => {
      logger.debug('Waiting for dump process to start writing to stdout');
      await Promise.race([exitPromise, readablePromise]);
    },
    waitForExit0: async () => {
      logger.debug('Waiting for dump process to exit');
      await exitPromise;
    },
  };
};

export const waitForProcessStart = (childProcess: ChildProcess) => {
  return new Promise((resolve, reject) => {
    let processStderr = '';
    logger.debug('Listening on dump process stderr');
    childProcess.stderr.addListener('data', (data) => { processStderr += data; });
    logger.debug('Listening on dump process close event');
    childProcess.addListener('close', (code) => {
      logger.debug('Child process close event fired', { code, processStderr });
      // TODO: If code is not 0, set a flag that will be tested before finishing backup
      // because the dumper can exit with an error in the middle of a backup
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
        const readed = childProcess.stdout.read();
        childProcess.stdout.unshift(readed);
        resolve();
      }
    };
    childProcess.stdout.addListener('readable', waitForReadable);
  });
};

export const waitForValidDumperExit = async (childProcess: ChildProcess) => {
  childProcess.addListener('exit', (code) => {
    console.log('exited', code);
  });
  await delay(15000);
};
