import * as unzip from 'unzip-stream';

import { chmodExec, computeFolderContentMd5, waitForStreamEnd } from './fs';

import Axios from 'axios';
import { DB_TYPE } from './config';
import logger from './log';
import mkdirp from 'mkdirp';
import { promisify } from 'util';
import { resolve } from 'path';

const mkdirpPromisifed = promisify(mkdirp);

const needToDownloadDumpProgram = async (type, dumpProgramDirectory) => {
  logger.debug('Getting dump programs MD5', { path: dumpProgramDirectory });
  await mkdirpPromisifed(dumpProgramDirectory);
  const existingMd5 = await computeFolderContentMd5(dumpProgramDirectory);
  const remoteMd5Url = {
    mysql: 'https://dl.dbacked.com/mysql_md5',
    pg: 'https://dl.dbacked.com/postgres_md5',
    mongodb: 'https://dl.dbacked.com/mongodb_md5',
  }[type];
  logger.debug('Got dump programs MD5', { md5: existingMd5 });
  logger.debug('Getting remote dump programs MD5');
  const remoteMd5 = await Axios.get(remoteMd5Url);
  logger.debug('Got remote programs MD5', { md5: remoteMd5.data });
  return existingMd5 !== remoteMd5.data;
};

export const checkDbDumpProgram = async (type: DB_TYPE, directory) => {
  const dumpProgramDirectory = resolve(directory, `${type}_dumper`);
  logger.debug('Testing if db dump program exists at', {
    path: dumpProgramDirectory,
  });
  if (await needToDownloadDumpProgram(type, dumpProgramDirectory)) {
    logger.debug('Downloading dump programs', { path: dumpProgramDirectory });
    const fileUrl = {
      mysql: 'https://dl.dbacked.com/mysql.zip',
      pg: 'https://dl.dbacked.com/postgres.zip',
      mongodb: 'https://dl.dbacked.com/mongodb.zip',
    }[type];
    logger.info('Downloading db dump program at url', { url: fileUrl });
    const response = await Axios.get(fileUrl, {
      responseType: 'stream',
    });
    const unzipper = unzip.Extract({ path: dumpProgramDirectory });
    response.data.pipe(unzipper);
    await waitForStreamEnd(unzipper, 'close');
    logger.info('Finished downloading db dumpprogram');
    await chmodExec(resolve(dumpProgramDirectory, 'dump'));
    await chmodExec(resolve(dumpProgramDirectory, 'restore'));
  }
};
