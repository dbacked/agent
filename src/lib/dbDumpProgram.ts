import { resolve } from 'path';
import Axios from 'axios';
import * as unzip from 'unzip-stream';
import * as mkdirp from 'mkdirp';
import { promisify } from 'util';

import { DB_TYPE } from './config';
import { waitForStreamEnd, chmodExec, computeFolderContentMd5 } from './fs';
import logger from './log';

const mkdirpPromisifed = promisify(mkdirp);

const needToDownloadDumpProgram = async (type, dumpProgramDirectory) => {
  logger.debug('Getting dump programs MD5', { path: dumpProgramDirectory });
  await mkdirpPromisifed(dumpProgramDirectory);
  const existingMd5 = await computeFolderContentMd5(dumpProgramDirectory);
  const remoteMd5Url = {
    mysql: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/mysql_md5',
    pg: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/postgres_md5',
  }[type];
  logger.debug('Got dump programs MD5', { md5: existingMd5 });
  logger.debug('Getting remote dump programs MD5');
  const remoteMd5 = await Axios.get(remoteMd5Url);
  logger.debug('Got remote programs MD5', { md5: remoteMd5.data });
  return existingMd5 !== remoteMd5.data;
};

export const checkDbDumpProgram = async (type: DB_TYPE, directory) => {
  const dumpProgramDirectory = resolve(directory, `${type}_dumper`);
  logger.debug('Testing if db dump program exists at', { path: dumpProgramDirectory });
  if (await needToDownloadDumpProgram(type, dumpProgramDirectory)) {
    logger.debug('Downloading dump programs', { path: dumpProgramDirectory });
    const fileUrl = {
      mysql: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/mysql.zip',
      pg: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/postgres.zip',
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
  }
};
