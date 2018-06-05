import Axios from 'axios';
import { PromiseReadable } from 'promise-readable';

import logger from './log';
// import { Stream, Readable } from 'stream';
// import { delay } from './delay';

const CHUNK_SIZE = 5 * 1024 * 1024;

export const uploadToS3 = async ({ fileStream, generateBackupUrl }) => {
  logger.debug('Starting S3 upload');
  let partNumber = 1;
  const promisifedStream = new PromiseReadable(fileStream);
  const partsEtag = [];
  while (true) {
    logger.debug('Waiting for chunk', { partNumber });
    const chunk = await promisifedStream.read(CHUNK_SIZE);
    if (!chunk) {
      break;
    }
    logger.debug('Starting uploading chunk', { partNumber, size: chunk.length });
    try {
      const url = await generateBackupUrl({ partNumber });
      const res = await Axios({
        method: 'PUT',
        url,
        data: chunk,
        transformRequest: [(data, headers) => {
          delete headers.put['Content-Type'];
          return data;
        }],
      });
      partsEtag.push(res.headers.etag);
    } catch (e) {
      console.error(e);
    }
    logger.debug('Uploaded chunk', { partNumber });
    partNumber++;
  }
  return partsEtag;
};
