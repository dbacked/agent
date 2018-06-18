import { stat, chmod } from 'fs';
import { promisify } from 'util';
import { Stream } from 'stream';

const statPromise = promisify(stat);
const chmodPromise = promisify(chmod);

export const fileExists = async (path) => {
  try {
    const fileStats = await statPromise(path);
    return fileStats.isFile();
  } catch (e) {
    return false;
  }
};

export const waitForStreamEnd = (stream: Stream) => {
  return new Promise((resolve) => {
    stream.on('end', () => {
      resolve();
    });
  });
};

export const chmodExec = async (path) => {
  await chmodPromise(path, '755');
};
