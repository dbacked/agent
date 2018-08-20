"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const aws_sdk_1 = require("aws-sdk");
const crypto_1 = require("crypto");
const log_1 = require("./log");
const delay_1 = require("./delay");
const streamToPromise_1 = require("./streamToPromise");
// import { Stream, Readable } from 'stream';
// import { delay } from './delay';
const uploadChunkToS3 = async ({ url, chunk, hash }, retryCount = 0) => {
    try {
        const res = await axios_1.default({
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
    }
    catch (e) {
        if (retryCount >= 2) { // already tried 3 times, giving up
            throw e;
        }
        log_1.default.warn('Error while uploading chunk to S3, waiting 10 seconds before trying again', { e: e.message });
        await delay_1.delay(10 * 1000);
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
exports.uploadToS3 = async ({ fileStream, generateBackupUrl }) => {
    log_1.default.info('Starting backup upload');
    const promisifedStream = new streamToPromise_1.default(fileStream);
    const partsEtag = [];
    let totalLength = 0;
    while (true) {
        const chunkSize = getChunkSize(partsEtag.length);
        promisifedStream.setSize(chunkSize);
        log_1.default.debug('Waiting for chunk', { partCount: partsEtag.length, size: chunkSize });
        const { done, value: chunk } = await promisifedStream.next();
        log_1.default.debug('Got chunk', { partCount: partsEtag.length });
        if (!chunk || done) {
            break;
        }
        const hash = crypto_1.createHash('md5').update(chunk).digest('base64');
        const url = await generateBackupUrl({ partNumber: partsEtag.length + 1, partHash: hash });
        log_1.default.debug('Starting uploading chunk', { partCount: partsEtag.length, size: chunk.length });
        const chunkEtag = await uploadChunkToS3({ url, chunk, hash });
        log_1.default.debug('Uploaded chunk', { partCount: partsEtag.length });
        partsEtag.push(chunkEtag);
        totalLength += chunkSize;
    }
    log_1.default.debug('Finished uploading chunks');
    return { partsEtag, totalLength };
};
exports.getBucketInfo = async ({ s3accessKeyId, s3secretAccessKey, s3region, s3bucket, }) => {
    const s3 = new aws_sdk_1.S3({
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
exports.initMultipartUpload = async (filename, config) => {
    const s3 = new aws_sdk_1.S3({
        accessKeyId: config.s3accessKeyId,
        secretAccessKey: config.s3secretAccessKey,
        signatureVersion: 'v4',
        region: config.s3region,
    });
    const { UploadId } = await s3.createMultipartUpload({
        Bucket: config.s3bucket,
        Key: filename,
        ContentType: 'application/octet-stream',
    }).promise();
    return UploadId;
};
exports.getUploadPartUrlFromLocalCredentials = async ({ uploadId, filename, partNumber, partHash, }, config) => {
    const s3 = new aws_sdk_1.S3({
        accessKeyId: config.s3accessKeyId,
        secretAccessKey: config.s3secretAccessKey,
        signatureVersion: 'v4',
        region: config.s3region,
    });
    return s3.getSignedUrl('uploadPart', {
        Bucket: config.s3bucket,
        Key: filename,
        UploadId: uploadId,
        PartNumber: partNumber,
        ContentMD5: partHash,
    });
};
exports.completeMultipartUpload = async ({ filename, uploadId, partsEtag, }, config) => {
    const s3 = new aws_sdk_1.S3({
        accessKeyId: config.s3accessKeyId,
        secretAccessKey: config.s3secretAccessKey,
        signatureVersion: 'v4',
        region: config.s3region,
    });
    return await s3.completeMultipartUpload({
        Bucket: config.s3bucket,
        Key: filename,
        UploadId: uploadId,
        MultipartUpload: {
            Parts: partsEtag.map((etag, i) => ({
                PartNumber: i + 1,
                ETag: etag,
            })),
        },
    }).promise();
};
exports.saveBackupMetadataOnS3 = async (metadata, config) => {
    const s3 = new aws_sdk_1.S3({
        accessKeyId: config.s3accessKeyId,
        secretAccessKey: config.s3secretAccessKey,
        signatureVersion: 'v4',
        region: config.s3region,
    });
    await s3.putObject({
        Bucket: config.s3bucket,
        Body: JSON.stringify(metadata, null, 4),
        Key: `${metadata.filename}_metadata`,
    }).promise();
};
//# sourceMappingURL=s3.js.map