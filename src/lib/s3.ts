import Axios from 'axios';
import { PromiseReadable } from 'promise-readable';
import { createHash } from 'crypto';

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
    const hash = createHash('md5').update(chunk).digest('base64');
    logger.debug('Starting uploading chunk', { partNumber, size: chunk.length });
    const url = await generateBackupUrl({ partNumber, partHash: hash });
    const res = await Axios({
      method: 'PUT',
      url,
      data: chunk,
      headers: {
        'Content-MD5': hash,
      },
      transformRequest: [(data, headers) => {
        delete headers.put['Content-Type'];
        return data;
      }],
    });
    logger.debug('Uploaded chunk', { partNumber });
    partsEtag.push(res.headers.etag);
    partNumber++;
  }
  return partsEtag;
};
