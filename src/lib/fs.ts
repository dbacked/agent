import { stat, chmod, readdir, createReadStream } from 'fs';
import { promisify } from 'util';
import { Stream } from 'stream';
import * as MultiStream from 'multistream';
import { createHash } from 'crypto';
import { resolve } from 'path';

const statPromised = promisify(stat);
const chmodPromised = promisify(chmod);
const readdirPromisifed = promisify(readdir);

export const fileExists = async (path) => {
  try {
    const fileStats = await statPromised(path);
    return fileStats.isFile();
  } catch (e) {
    return false;
  }
};

export const waitForStreamEnd = (stream: Stream, eventName = 'end') => {
  return new Promise((resolvePromise) => {
    stream.on(eventName, () => {
      resolvePromise();
    });
  });
};

export const chmodExec = async (path) => {
  await chmodPromised(path, '755');
};

export const computeFolderContentMd5 = async (directory) => {
  const filesName = await readdirPromisifed(directory);
  if (!filesName.length) {
    return '';
  }
  const filesStream = filesName
    .sort()
    .map((filename) => createReadStream(resolve(directory, filename)));
  const md5 = createHash('md5');
  const concatenatedFileStream = new MultiStream(filesStream);
  concatenatedFileStream.pipe(md5);
  await waitForStreamEnd(md5);
  return md5.digest('hex');
};
