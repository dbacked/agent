"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
const path_1 = require("path");
const crypto_1 = require("crypto");
const MultiStream = require("multistream");
const stream_1 = require("stream");
const daemon = require("daemonize-process");
const lockfile = require("proper-lockfile");
const fs_1 = require("fs");
const util_1 = require("util");
const assertExit_1 = require("./lib/assertExit");
const dbackedApi_1 = require("./lib/dbackedApi");
const delay_1 = require("./lib/delay");
const agentId_1 = require("./lib/agentId");
const log_1 = require("./lib/log");
const dbDumpProgram_1 = require("./lib/dbDumpProgram");
const config_1 = require("./lib/config");
const dbBackup_1 = require("./lib/dbBackup");
const s3_1 = require("./lib/s3");
const streamHelpers_1 = require("./lib/streamHelpers");
const VERSION = [0, 0, 1];
const mkdirPromise = util_1.promisify(fs_1.mkdir);
program.version(VERSION.join('.'))
    .option('--apikey <apikey>', '[REQUIRED] DBacked API key (can also be provided with the DBACKED_APIKEY env variable)')
    .option('--db-type <dbType>', '[REQUIRED] Database type (pg or mysql) (env variable: DBACKED_DB_TYPE)')
    .option('--db-host <dbHost>', '[REQUIRED] Database host (env variable: DBACKED_DB_HOST)')
    .option('--db-username <dbUsername>', '[REQUIRED] Database username (env variable: DBACKED_DB_USERNAME)')
    .option('--db-password <dbPassword>', '[REQUIRED] Database password (env variable: DBACKED_DB_PASSWORD)')
    .option('--db-name <dbName>', '[REQUIRED] Database name (env variable: DBACKED_DB_NAME)')
    .option('--public-key <publicKey>', 'Public key linked to the project (env variable: DBACKED_PUBLIC_KEY)')
    .option('--config-directory <directory>', 'Directory where the agent id and others files are stored, default $HOME/.dbacked')
    .option('--daemon', 'Detach the process as a daemon, will check if another daemon is not already started')
    .option('--daemon-name <name>', 'Allows multiple daemons to be started at the same time under different names')
    .parse(process.argv);
const config = {
    apikey: program.apikey || process.env.DBACKED_APIKEY,
    publicKey: program.publicKey || process.env.DBACKED_PUBLIC_KEY,
    dbType: program.dbType || process.env.DBACKED_DB_TYPE,
    dbHost: program.dbHost || process.env.DBACKED_DB_HOST,
    dbUsername: program.dbUsername || process.env.DBACKED_DB_USERNAME,
    dbPassword: program.dbPassword || process.env.DBACKED_DB_PASSWORD,
    dbName: program.dbName || process.env.DBACKED_DB_NAME,
    configDirectory: program.configDirectory || path_1.resolve(process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'], '.dbacked'),
};
assertExit_1.default(config.apikey && config.apikey.length, '--apikey is required');
assertExit_1.default(config.dbType && config.dbType.length, '--db-type is required');
assertExit_1.default(config_1.DB_TYPE[config.dbType], '--db-type should be pg or mysql');
assertExit_1.default(config.dbHost && config.dbHost.length, '--db-host is required');
assertExit_1.default(config.dbUsername && config.dbUsername.length, '--db-username is required');
assertExit_1.default(config.dbPassword && config.dbPassword.length, '--db-password is required');
assertExit_1.default(config.dbName && config.dbName.length, '--db-name is required');
if (!config.publicKey) {
    log_1.default.warn('You didn\'t provide your public key via the --public-key or env varible DBACKED_PUBLIC_KEY, this could expose you to a man in the middle attack on your backups');
}
async function main() {
    const agentId = await agentId_1.getOrGenerateAgentId({ directory: config.configDirectory });
    log_1.default.info('Agent id:', { agentId });
    dbackedApi_1.registerApiKey(config.apikey);
    // Used to test the apiKey before daemonizing
    await dbackedApi_1.getProject();
    if (program.daemon) {
        const daemonName = program.daemonName ? `dbacked_${program.daemonName}` : 'dbacked';
        const lockDir = `/tmp/${daemonName}`;
        try {
            await mkdirPromise(lockDir);
        }
        catch (e) { }
        // TODO check version of daemonized process and kill it if different
        if (await lockfile.check(lockDir)) {
            log_1.default.error('A daemon is already running, use the --daemon-name params if you need to launch it multiple time');
            process.exit(1);
        }
        daemon();
        await lockfile.lock(lockDir);
    }
    let backup;
    while (true) {
        const project = await dbackedApi_1.getProject();
        if (!config.publicKey) {
            config.publicKey = project.publicKey;
        }
        try {
            const backupInfo = await dbackedApi_1.createBackup({
                agentId,
                agentVersion: VERSION.join('.'),
                publicKey: config.publicKey,
                dbType: config.dbType,
            });
            backup = backupInfo.backup;
            // TODO test for mysql
            await dbDumpProgram_1.checkDbDumpProgram(config.dbType, config.configDirectory);
            const hash = crypto_1.createHash('md5');
            const { key: backupKey, encryptedKey } = await dbBackup_1.createBackupKey(config.publicKey);
            const { backupStream, iv } = await dbBackup_1.startBackup(backupKey, config);
            const magicStream = streamHelpers_1.createReadStream(Buffer.from('DBACKED'));
            // need to align to 4 so prepending 0 to version buffer
            const versionStream = streamHelpers_1.createReadStream(Buffer.from([...VERSION]));
            const encryptedKeyLengthStream = streamHelpers_1.createReadStream(Buffer.from((new Uint32Array([encryptedKey.length])).buffer));
            const encryptedKeyStream = streamHelpers_1.createReadStream(encryptedKey);
            const ivStream = streamHelpers_1.createReadStream(iv);
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
                        backup, partNumber, agentId, hash: partHash,
                    });
                    return partUploadUrl;
                },
            });
            log_1.default.info('Informing server the upload is finished');
            hash.end();
            await dbackedApi_1.finishUpload({
                backup, partsEtag, hash: hash.digest('base64'), agentId,
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
                    await dbackedApi_1.reportError({ backup, error: e.code || (e.response && e.response.data) || e.message, agentId });
                }
                log_1.default.error('Unknown error while creating backup, waiting 5 minutes', { error: e.code || (e.response && e.response.data) || e.message });
            }
        }
        await delay_1.delay(5 * 60 * 1000);
    }
}
main();
//# sourceMappingURL=index.js.map