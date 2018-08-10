import Axios from 'axios';
import { S3 } from 'aws-sdk';
import { createHash } from 'crypto';

import logger from './log';
import { delay } from './delay';
import PromisifiedReadableStream from './streamToPromise';
// import { Stream, Readable } from 'stream';
// import { delay } from './delay';

const uploadChunkToS3 = async ({ url, chunk, hash }, retryCount = 0) => {
  try {
    const res = await Axios({
      maxContentLength: Infinity,
      method: 'PUT',
      url,
      data: chunk,
      headers: {
        'Content-MD5': hash,
      },
      transformRequest: [(data, headers) => {
        delete headers.put['Content-Type']; // eslint-disable-line
        return data;
      }],
    });
    return res.headers.etag;
  } catch (e) {
    if (retryCount >= 2) { // already tried 3 times, giving up
      throw e;
    }
    logger.warn('Error while uploading chunk to S3, waiting 10 seconds before trying again', { e: e.message });
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
  const promisifedStream = new PromisifiedReadableStream(fileStream);
  const partsEtag = [];
  while (true) { // eslint-disable-line
    const chunkSize = getChunkSize(partsEtag.length);
    promisifedStream.setSize(chunkSize);
    logger.debug('Waiting for chunk', { partCount: partsEtag.length, size: chunkSize });
    const { done, value: chunk } = await promisifedStream.next();
    logger.debug('Got chunk', { partCount: partsEtag.length });
    if (!chunk || done) {
      break;
    }
    const hash = createHash('md5').update(chunk).digest('base64');
    const url = await generateBackupUrl({ partNumber: partsEtag.length + 1, partHash: hash });
    logger.debug('Starting uploading chunk', { partCount: partsEtag.length, size: chunk.length });
    const chunkEtag = await uploadChunkToS3({ url, chunk, hash });
    logger.debug('Uploaded chunk', { partCount: partsEtag.length });
    partsEtag.push(chunkEtag);
  }
  logger.debug('Finished uploading chunks');
  return partsEtag;
};

export const getBucketInfo = async ({
  s3accessKeyId, s3secretAccessKey, s3region, s3bucket,
}) => {
  const s3 = new S3({
    accessKeyId: s3accessKeyId,
    secretAccessKey: s3secretAccessKey,
    signatureVersion: 'v4',
    region: s3region,
  });
  const bucketInfo = s3.headBucket({
    Bucket: s3bucket,
  }).promise();
  return bucketInfo;
};
