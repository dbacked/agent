"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = require("path");
const util_1 = require("util");
const crypto_1 = require("crypto");
const log_1 = require("./log");
const waitForProcessStart_1 = require("./waitForProcessStart");
const zlib_1 = require("zlib");
const randomBytesPromise = util_1.promisify(crypto_1.randomBytes);
exports.startBackup = async (backupKey, config) => {
    log_1.default.debug('Starting dump');
    let args;
    if (config.dbType === 'pg') {
        args = [
            '-U', config.dbUsername, '-h', config.dbHost,
            '--format=c',
            config.dbName,
        ];
    }
    else if (config.dbType === 'mysql') {
        args = [
            '-u', config.dbUsername, '-h', config.dbHost,
            '-C', '--single-transaction', `--password=${config.dbPassword}`,
            config.dbName,
        ];
    }
    const iv = await randomBytesPromise(128 / 8);
    const cipher = crypto_1.createCipheriv('aes256', backupKey, iv);
    const dumpProcess = await child_process_1.spawn(path_1.resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`, 'dump'), args, {
        stdio: 'pipe',
        env: {
            PGPASSWORD: config.dbPassword,
            LD_LIBRARY_PATH: path_1.resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`),
        },
    });
    log_1.default.debug('Started dump process');
    await waitForProcessStart_1.waitForProcessStart(dumpProcess);
    log_1.default.debug('Dump process started');
    const gzip = zlib_1.createGzip();
    dumpProcess.stdout.pipe(gzip);
    gzip.pipe(cipher);
    log_1.default.debug('Piped to cipher');
    return {
        backupStream: cipher,
        iv,
    };
};
exports.createBackupKey = async (publicKey) => {
    log_1.default.debug('Creating AES key');
    const key = await randomBytesPromise(256 / 8);
    log_1.default.debug('Encrypting AES key with RSA public key');
    const encryptedKey = crypto_1.publicEncrypt(publicKey, key);
    log_1.default.debug('Generated encrypted AES key');
    return { key, encryptedKey };
};
//# sourceMappingURL=dbBackup.js.map