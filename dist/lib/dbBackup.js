"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = require("path");
const util_1 = require("util");
const crypto_1 = require("crypto");
const log_1 = require("./log");
const waitForProcessStart_1 = require("./waitForProcessStart");
const randomBytesPromise = util_1.promisify(crypto_1.randomBytes);
exports.startBackup = async (backupKey, config) => {
    log_1.default.debug('Starting dump');
    let args;
    if (config.dbType === 'pg') {
        args = [
            '-U', config.dbUsername, '-h', config.dbHost,
            '-Z', '7', '--format=c', '-W',
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
    const dumpProcess = await child_process_1.spawn(path_1.resolve(config.configDirectory, `${config.dbType}_dump`), args, {
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    log_1.default.debug('Started dump process');
    if (config.dbType === 'pg') {
        log_1.default.debug('Writing password');
        dumpProcess.stdin.write(config.dbPassword);
        dumpProcess.stdin.write('\n');
        dumpProcess.stdin.end();
    }
    await waitForProcessStart_1.waitForProcessStart(dumpProcess);
    log_1.default.debug('Dump process started');
    dumpProcess.stdout.pipe(cipher);
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