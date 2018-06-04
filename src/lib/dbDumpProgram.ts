import { resolve } from 'path';
import Axios from 'axios';
import { createWriteStream, chmod } from 'fs';

import { DB_TYPE } from './config';
import { fileExists, waitForStreamEnd, chmodExec } from './fs';
import logger from './log';

export const checkDbDumpProgram = async (type: DB_TYPE, directory) => {
  const dumpProgramPath = resolve(directory, `${type}_dump`);
  logger.debug('Testing if db dump program exists at', { path: dumpProgramPath });
  if (await fileExists(dumpProgramPath)) {
    logger.debug('db dump program exists at', { path: dumpProgramPath });
    return;
  }
  const fileUrl = {
    mysql: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/mysqldump',
    pg: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/pg_dump',
  }[type];
  logger.info('Downloading db dump program at url', { url: fileUrl });
  const response = await Axios.get(fileUrl, {
    responseType: 'stream',
  });
  response.data.pipe(createWriteStream(dumpProgramPath));
  await waitForStreamEnd(response.data);
  logger.info('Finished downloading db dumpprogram');
  await chmodExec(dumpProgramPath);
};
