import Axios from 'axios';
import { PromiseReadable } from 'promise-readable';
import { createHash } from 'crypto';

import logger from './log';
import { delay } from './delay';
// import { Stream, Readable } from 'stream';
// import { delay } from './delay';

const uploadChunkToS3 = async ({ url, chunk, hash }, retryCount = 0) => {
  try {
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
    return res.headers.etag;
  } catch (e) {
    if (retryCount >= 2) { // already tried 3 times, giving up
      throw e;
    }
    logger.warn('Error while uploading chunk to S3, waiting 10 seconds before trying again', { e });
    await delay(10 * 1000);
    return uploadChunkToS3({ url, chunk, hash }, retryCount + 1);
  }
};

const getChunkSize = (partCount) => {
  if (partCount < 5) {
    return 5 * 1024 * 1024; // 5MB chunks
  }
  // here we already have uploaded 25MB
  if (partCount < 25) {
    return 50 * 1024 * 1024; // 50MB chunks
  }
  // here we have already uploaded 5 * 5MB + 20 * 50MB = 1025MB
  if (partCount < 50) {
    return 100 * 1024 * 1024; // 100MB chunks
  }
  // here we have already uploaded 5 * 5MB + 20 * 50MB + 25 * 100 = 3525MB
  // We don't want to use more than 200MB because it needs to be stored in RAM
  return 200 * 1024 * 1024;
};

export const uploadToS3 = async ({ fileStream, generateBackupUrl }) => {
  logger.info('Starting backup upload');
  const promisifedStream = new PromiseReadable(fileStream);
  const partsEtag = [];
  while (true) {
    logger.debug('Waiting for chunk', { partCount: partsEtag.length });
    const chunk = await promisifedStream.read(getChunkSize(partsEtag.length));
    if (!chunk) {
      break;
    }
    const hash = createHash('md5').update(chunk).digest('base64');
    logger.debug('Starting uploading chunk', { partCount: partsEtag.length, size: chunk.length });
    const url = await generateBackupUrl({ partNumber: partsEtag.length + 1, partHash: hash });
    const chunkEtag = await uploadChunkToS3({ url, chunk, hash });
    logger.debug('Uploaded chunk', { partCount: partsEtag.length });
    partsEtag.push(chunkEtag);
  }
  return partsEtag;
};
