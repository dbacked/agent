"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const promise_readable_1 = require("promise-readable");
const crypto_1 = require("crypto");
const log_1 = require("./log");
// import { Stream, Readable } from 'stream';
// import { delay } from './delay';
const CHUNK_SIZE = 5 * 1024 * 1024;
exports.uploadToS3 = async ({ fileStream, generateBackupUrl }) => {
    log_1.default.info('Starting backup upload');
    let partNumber = 1;
    const promisifedStream = new promise_readable_1.PromiseReadable(fileStream);
    const partsEtag = [];
    while (true) {
        log_1.default.debug('Waiting for chunk', { partNumber });
        const chunk = await promisifedStream.read(CHUNK_SIZE);
        if (!chunk) {
            break;
        }
        const hash = crypto_1.createHash('md5').update(chunk).digest('base64');
        log_1.default.debug('Starting uploading chunk', { partNumber, size: chunk.length });
        const url = await generateBackupUrl({ partNumber, partHash: hash });
        const res = await axios_1.default({
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
        log_1.default.debug('Uploaded chunk', { partNumber });
        partsEtag.push(res.headers.etag);
        partNumber++;
    }
    return partsEtag;
};
//# sourceMappingURL=s3.js.map