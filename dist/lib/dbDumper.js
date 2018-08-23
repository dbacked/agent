"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = require("path");
const util_1 = require("util");
const crypto_1 = require("crypto");
const log_1 = require("./log");
const childProcessHelpers_1 = require("./childProcessHelpers");
const zlib_1 = require("zlib");
const randomBytesPromise = util_1.promisify(crypto_1.randomBytes);
exports.startDumper = async (backupKey, config) => {
    log_1.default.debug('Starting dump');
    const args = {
        pg: () => {
            const pgArgs = [
                '-h', config.dbHost,
                '--format=c',
            ];
            if (config.dbUsername) {
                pgArgs.push('-U');
                pgArgs.push(config.dbUsername);
            }
            if (!config.dbPassword) {
                pgArgs.push('--no-password');
            }
            // TODO: add additionnal flags from config
            pgArgs.push(config.dbName);
            return pgArgs;
        },
        mysql: () => {
            const mysqlArgs = [
                '-h', config.dbHost,
                '-C', '--single-transaction',
                '--column-statistics=0',
            ];
            if (config.dbUsername) {
                mysqlArgs.push('-u');
                mysqlArgs.push(config.dbUsername);
            }
            if (config.dbPassword) {
                mysqlArgs.push(`--password=${config.dbPassword}`);
            }
            // TODO: add additionnal flags from config
            mysqlArgs.push(config.dbName);
            return mysqlArgs;
        },
        mongodb: () => {
            const mongodbArgs = [
                '--host', config.dbHost,
                '--archive',
            ];
            if (config.dbName) {
                mongodbArgs.push('--db');
                mongodbArgs.push(config.dbName);
            }
            if (config.dbUsername && config.dbPassword) {
                mongodbArgs.push('--username');
                mongodbArgs.push(config.dbUsername);
                mongodbArgs.push('--password');
                mongodbArgs.push(config.dbPassword);
            }
            // TODO: add additionnal flags from config
            return mongodbArgs;
        },
    }[config.dbType]();
    const iv = await randomBytesPromise(128 / 8);
    const cipher = crypto_1.createCipheriv('aes256', backupKey, iv);
    const dumpProcess = await child_process_1.spawn(path_1.resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`, 'dump'), args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            PGPASSWORD: config.dbPassword,
            LD_LIBRARY_PATH: path_1.resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`),
        },
    });
    const processWatcher = await childProcessHelpers_1.createProcessWatcher(dumpProcess);
    log_1.default.debug('Started dump process');
    dumpProcess.on('close', (code) => {
        log_1.default.debug('Dumper closed', { code });
    });
    await processWatcher.waitForStdoutStart();
    log_1.default.debug('Dump process started');
    const gzip = zlib_1.createGzip();
    dumpProcess.stdout.pipe(gzip);
    gzip.pipe(cipher);
    log_1.default.debug('Piped to cipher');
    return {
        backupStream: cipher,
        iv,
        processWatcher,
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
//# sourceMappingURL=dbDumper.js.map