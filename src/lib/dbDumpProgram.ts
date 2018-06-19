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
  await mkdirpPromisifed(dumpProgramDirectory);
  const existingMd5 = await computeFolderContentMd5(dumpProgramDirectory);
  const remoteMd5Url = {
    mysql: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/mysql_md5',
    pg: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/postgres_md5',
  }[type];
  const remoteMd5 = (await Axios.get(remoteMd5Url)).toString();
  return existingMd5 !== remoteMd5;
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
    response.data.pipe(unzip.Extract({ path: dumpProgramDirectory }));
    await waitForStreamEnd(response.data);
    logger.info('Finished downloading db dumpprogram');
    await chmodExec(resolve(dumpProgramDirectory, 'dump'));
  }
};
