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
let backup;
log_1.default.debug('Backup worker starting');
exports.backupDatabase = async (config, backupInfo) => {
    try {
        dbackedApi_1.registerApiKey(config.apikey);
        // Used to test the apiKey before daemonizing
        // TODO: if ECONREFUSED, try again 5 minutes later
        const project = await dbackedApi_1.getProject();
        if (!config.publicKey) {
            config.publicKey = project.publicKey;
        }
        backup = backupInfo.backup;
        // TODO test for mysql
        await dbDumpProgram_1.checkDbDumpProgram(config.dbType, config.dumpProgramsDirectory);
        const hash = crypto_1.createHash('md5');
        const { key: backupKey, encryptedKey } = await dbDumper_1.createBackupKey(config.publicKey);
        const { backupStream, iv } = await dbDumper_1.startDumper(backupKey, config);
        log_1.default.debug('Creating backup file stream PassThrough');
        const backupFileStream = new stream_1.PassThrough({
            highWaterMark: 201 * 1024 * 1024,
        });
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
        const partsEtag = await s3_1.uploadToS3({
            fileStream: uploadingStream,
            generateBackupUrl: async ({ partNumber, partHash }) => {
                log_1.default.debug('Getting multipart upload URL for part number', { partNumber });
                const { partUploadUrl } = await dbackedApi_1.getUploadPartUrl({
                    backup, partNumber, agentId: config.agentId, hash: partHash,
                });
                return partUploadUrl;
            },
        });
        log_1.default.info('Informing server the upload is finished');
        hash.end();
        await dbackedApi_1.finishUpload({
            backup,
            partsEtag,
            hash: hash.read().toString('hex'),
            agentId: config.agentId,
            publicKey: config.publicKey,
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