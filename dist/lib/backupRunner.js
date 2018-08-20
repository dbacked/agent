"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const stream_1 = require("stream");
const dbackedApi_1 = require("./dbackedApi");
const log_1 = require("./log");
const dbDumpProgram_1 = require("./dbDumpProgram");
const dbDumper_1 = require("./dbDumper");
const s3_1 = require("./s3");
const constants_1 = require("./constants");
const config_1 = require("./config");
const luxon_1 = require("luxon");
const dbStats_1 = require("./dbStats");
const helpers_1 = require("./helpers");
let backup;
log_1.default.debug('Backup worker starting');
exports.backupDatabase = async (config, backupInfo) => {
    try {
        const backupStartDate = new Date();
        backup = backupInfo.backup || {};
        await dbDumpProgram_1.checkDbDumpProgram(config.dbType, config.dumpProgramsDirectory);
        const hash = crypto_1.createHash('md5');
        // key is the unique AES key, encrypted key is this AES key encrypted with the RSA public key
        const { key: backupKey, encryptedKey } = await dbDumper_1.createBackupKey(config.publicKey);
        // IV is the initiation vector of the AES algorithm
        const { backupStream, iv } = await dbDumper_1.startDumper(backupKey, config);
        log_1.default.debug('Creating backup file stream PassThrough');
        const backupFileStream = new stream_1.PassThrough({
            highWaterMark: 201 * 1024 * 1024,
        });
        // Magic bytes used to verify Backup file
        backupFileStream.write(Buffer.from('DBACKED'));
        backupFileStream.write(Buffer.from([...constants_1.VERSION]));
        backupFileStream.write(Buffer.from((new Uint32Array([encryptedKey.length])).buffer));
        backupFileStream.write(encryptedKey);
        backupFileStream.write(iv);
        backupStream.pipe(backupFileStream);
        // Need a passthrough because else the stream is just consumed by the hash
        const uploadingStream = new stream_1.PassThrough({
            highWaterMark: 201 * 1024 * 1024,
        });
        backupFileStream.pipe(uploadingStream);
        backupFileStream.pipe(hash);
        if (config.subscriptionType === config_1.SUBSCRIPTION_TYPE.free) {
            backup.date = luxon_1.DateTime.utc();
            backup.filename = `backup_${helpers_1.getDbNaming(config)}_${backup.date.toFormat('ddLLyyyyHHmm')}`;
            backup.s3uploadId = await s3_1.initMultipartUpload(backup.filename, config);
        }
        const { partsEtag, totalLength } = await s3_1.uploadToS3({
            fileStream: uploadingStream,
            generateBackupUrl: async ({ partNumber, partHash }) => {
                log_1.default.debug('Getting multipart upload URL for part number', { partNumber });
                if (config.subscriptionType === config_1.SUBSCRIPTION_TYPE.premium) {
                    const { partUploadUrl } = await dbackedApi_1.getUploadPartUrl({
                        backup, partNumber, agentId: config.agentId, hash: partHash,
                    });
                    return partUploadUrl;
                }
                return s3_1.getUploadPartUrlFromLocalCredentials({
                    filename: backup.filename,
                    uploadId: backup.s3uploadId,
                    partNumber,
                    partHash,
                }, config);
            },
        });
        log_1.default.info('Informing server the upload is finished');
        hash.end();
        if (config.subscriptionType === config_1.SUBSCRIPTION_TYPE.premium) {
            await dbackedApi_1.finishUpload({
                backup,
                partsEtag,
                hash: hash.read().toString('hex'),
                agentId: config.agentId,
                publicKey: config.publicKey,
            });
        }
        else if (config.subscriptionType === config_1.SUBSCRIPTION_TYPE.free) {
            await s3_1.completeMultipartUpload({
                filename: backup.filename,
                uploadId: backup.s3uploadId,
                partsEtag,
            }, config);
            await dbStats_1.saveBackupStatus(config.dbType, { lastBackupDate: luxon_1.DateTime.utc().toMillis() }, config);
            await s3_1.saveBackupMetadataOnS3({
                filename: backup.filename,
                hash: hash.read().toString('hex'),
                publicKey: config.publicKey,
                agentId: config.agentId,
                timestamp: backup.date.toMillis(),
                dbType: config.dbType,
                dbName: helpers_1.getDbNaming(config),
                size: totalLength,
            }, config);
            await dbackedApi_1.sendBackupBeacon(config);
        }
        await dbackedApi_1.sendAnalytics(config, {
            timing: (new Date()).getTime() - backupStartDate.getTime(),
            size: totalLength,
        });
        log_1.default.info('backup finished !');
        process.exit(0);
    }
    catch (e) {
        log_1.default.error('Unknown error while creating backup', { error: e.code || (e.response && e.response.data) || e.message });
        process.send(JSON.stringify({
            type: 'error',
            payload: `${JSON.stringify(e.code || (e.response && e.response.data) || e.message)}\n${e.stack}`,
        }));
    }
};
process.on('message', (message) => {
    try {
        const { type, payload } = JSON.parse(message);
        if (type === 'startBackup') {
            exports.backupDatabase(payload.config, payload.backupInfo);
        }
    }
    catch (e) { }
});
process.on('uncaughtException', (e) => {
    console.error(e);
    const error = e;
    process.send(JSON.stringify({
        type: 'error',
        payload: `${error.code || (error.response && error.responserror.data) || error.message}\n${error.stack}`,
    }));
    process.exit(1);
});
//# sourceMappingURL=backupRunner.js.map