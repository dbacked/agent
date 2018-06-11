import { stat, chmod, createReadStream, PathLike } from 'fs';
import { promisify } from 'util';
import { Stream } from 'stream';
import { createHash } from 'crypto';

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

export const chmodExec = async (path) => {
  await chmodPromise(path, '755');
};

export const waitForStreamEnd = (stream: Stream) => {
  return new Promise((resolve) => {
    stream.on('end', () => {
      resolve();
    });
  });
};

export const getFileMd5 = (filePath: PathLike) => {
  return new Promise((resolve) => {
    const hash = createHash('md5');
    const stream = createReadStream(filePath);
    stream.pipe(hash);
    hash.on('readable', () => {
      resolve((<Buffer>hash.read()).toString('hex'));
    });
  });
};
