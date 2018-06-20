"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const MultiStream = require("multistream");
const stream_1 = require("stream");
const dbackedApi_1 = require("./dbackedApi");
const log_1 = require("./log");
const dbDumpProgram_1 = require("./dbDumpProgram");
const dbBackup_1 = require("./dbBackup");
const s3_1 = require("./s3");
const streamHelpers_1 = require("./streamHelpers");
const reportError_1 = require("./reportError");
let backup;
exports.backupDatabase = async (config, VERSION) => {
    dbackedApi_1.registerApiKey(config.apikey);
    // Used to test the apiKey before daemonizing
    // TODO: if ECONREFUSED, try again 5 minutes later
    const project = await dbackedApi_1.getProject();
    if (!config.publicKey) {
        config.publicKey = project.publicKey;
    }
    try {
        const backupInfo = await dbackedApi_1.createBackup({
            agentId: config.agentId,
            agentVersion: VERSION.join('.'),
            publicKey: config.publicKey,
            dbType: config.dbType,
        });
        backup = backupInfo.backup;
        // TODO test for mysql
        await dbDumpProgram_1.checkDbDumpProgram(config.dbType, config.dumpProgramsDirectory);
        const hash = crypto_1.createHash('md5');
        const { key: backupKey, encryptedKey } = await dbBackup_1.createBackupKey(config.publicKey);
        const { backupStream, iv } = await dbBackup_1.startBackup(backupKey, config);
        const magicStream = streamHelpers_1.createReadStream(Buffer.from('DBACKED'));
        const versionStream = streamHelpers_1.createReadStream(Buffer.from([...VERSION]));
        const encryptedKeyLengthStream = streamHelpers_1.createReadStream(Buffer.from((new Uint32Array([encryptedKey.length])).buffer));
        const encryptedKeyStream = streamHelpers_1.createReadStream(encryptedKey);
        const ivStream = streamHelpers_1.createReadStream(iv);
        log_1.default.debug('Creating multistream');
        const backupFileStream = MultiStream([
            magicStream,
            versionStream,
            encryptedKeyLengthStream,
            encryptedKeyStream,
            ivStream,
            backupStream,
        ]);
        // Need a passthrough because else the stream is just consumed by the hash
        const uploadingStream = new stream_1.PassThrough();
        backupFileStream.pipe(hash);
        backupFileStream.pipe(uploadingStream);
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
            backup, partsEtag, hash: hash.digest('base64'), agentId: config.agentId,
        });
        log_1.default.info('backup finished !');
        backup = undefined;
    }
    catch (e) {
        if (e.response && e.response.data && e.response.data.message === 'No backup needed for the moment') {
            log_1.default.info('No backup needed, waiting 5 minutes');
        }
        else {
            if (backup) {
                await reportError_1.reportErrorSync({
                    backup,
                    e,
                    agentId: config.agentId,
                    apikey: config.apikey,
                });
            }
            log_1.default.error('Unknown error while creating backup, waiting 5 minutes', { error: e.code || (e.response && e.response.data) || e.message });
        }
    }
};
//# sourceMappingURL=backup.js.map