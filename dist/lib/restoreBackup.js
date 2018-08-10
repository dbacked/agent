"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer_1 = require("inquirer");
const luxon_1 = require("luxon");
const axios_1 = require("axios");
const node_forge_1 = require("node-forge");
const config_1 = require("./config");
const dbackedApi_1 = require("./dbackedApi");
const log_1 = require("./log");
const helpers_1 = require("./helpers");
const assertExit_1 = require("./assertExit");
const fs_1 = require("./fs");
const crypto_1 = require("crypto");
const zlib_1 = require("zlib");
const dbDumpProgram_1 = require("./dbDumpProgram");
const dbRestoreProgram_1 = require("./dbRestoreProgram");
const streamToPromise_1 = require("./streamToPromise");
const getBackupToRestore = async (config, { useLastBackup }) => {
    dbackedApi_1.registerApiKey(config.apikey);
    const project = await dbackedApi_1.getProject();
    const availableBackups = project.backups.filter(({ finishedAt }) => !!finishedAt);
    if (!availableBackups.length) {
        log_1.default.error('No backup available for this project');
        process.exit(1);
    }
    if (useLastBackup) {
        return project.backups[0];
    }
    const { backup } = await inquirer_1.prompt([{
            type: 'list',
            name: 'backup',
            message: 'Which backup to restore?',
            choices: availableBackups.map((backupChoice, i) => ({
                name: `${backupChoice.dbType} - ${luxon_1.DateTime.fromISO(backupChoice.finishedAt).toLocaleString(luxon_1.DateTime.DATETIME_MED)} - ${helpers_1.formatBytes(backupChoice.size)} ${i === 0 ? '- Last backup' : ''}`,
                value: backupChoice,
            })),
        }]);
    return backup;
};
const getBackupStream = async (config, { useLastBackup, useStdin }) => {
    if (useStdin) {
        return process.stdin;
    }
    const backup = await getBackupToRestore(config, { useLastBackup });
    const backupDownloadUrl = await dbackedApi_1.getBackupDownloadUrl(backup);
    const { data } = await axios_1.default({
        method: 'get',
        url: backupDownloadUrl,
        responseType: 'stream',
    });
    return data;
};
const decryptAesKey = async (commandLine, encryptedAesKey) => {
    let privateKey;
    if (commandLine.privateKeyPath) {
        try {
            privateKey = await fs_1.readFilePromisified(commandLine.privateKeyPath, { encoding: 'utf-8' });
        }
        catch (e) {
            assertExit_1.default(false, `Couldn't read private key: ${e}`);
        }
    }
    else if (process.env.DBACKED_PRIVATE_KEY) {
        privateKey = process.env.DBACKED_PRIVATE_KEY;
    }
    else {
        assertExit_1.default(false, 'No private key was provided by --private-key-path or DBACKED_PRIVATE_KEY env');
    }
    if (privateKey.split('\n')[1] === 'Proc-Type: 4,ENCRYPTED') {
        const { passphrase } = await inquirer_1.prompt([{
                type: 'input',
                name: 'passphrase',
                message: 'Private key passphrase',
            }]);
        try {
            const decryptedPrivateKey = node_forge_1.pki.decryptRsaPrivateKey(privateKey, passphrase);
            assertExit_1.default(decryptedPrivateKey, 'Invalid passphrase');
            privateKey = node_forge_1.pki.privateKeyToPem(decryptedPrivateKey);
        }
        catch (e) {
            console.error('Corrupted private key or invalid passphrase, try decrypting the key with openssl cli', e);
            process.exit(1);
        }
    }
    try {
        return crypto_1.privateDecrypt(privateKey, encryptedAesKey);
    }
    catch (e) {
        console.error('Invalid private key, please check that the downloaded backup is not corrupted and you have the right private key');
        process.exit(1);
    }
};
exports.restoreBackup = async (commandLine) => {
    const config = await config_1.getConfig(commandLine, { interactive: !commandLine.y });
    const backupStream = await getBackupStream(config, {
        useLastBackup: commandLine.lastBackup,
        useStdin: commandLine.rawInput,
    });
    const promisifiedBackupStream = new streamToPromise_1.default(backupStream);
    promisifiedBackupStream.setSize(7);
    assertExit_1.default((await promisifiedBackupStream.next()).value.toString() === 'DBACKED', 'Invalid start of file, check for file corruption');
    promisifiedBackupStream.setSize(3);
    const version = [...(await promisifiedBackupStream.next()).value]; // eslint-disable-line
    promisifiedBackupStream.setSize(4);
    const aesKeyLengthBuffer = (await promisifiedBackupStream.next()).value;
    const [aesKeyLength] = new Uint32Array(aesKeyLengthBuffer.buffer.slice(aesKeyLengthBuffer.byteOffset, aesKeyLengthBuffer.byteOffset + 4));
    promisifiedBackupStream.setSize(aesKeyLength);
    const encryptedAesKey = (await promisifiedBackupStream.next()).value;
    assertExit_1.default(encryptedAesKey && encryptedAesKey.length === aesKeyLength, 'File ends before reading aes key, no aes key header, is file truncated?');
    const decryptedAesKey = await decryptAesKey(commandLine, encryptedAesKey);
    promisifiedBackupStream.setSize(16);
    const iv = (await promisifiedBackupStream.next()).value;
    assertExit_1.default(iv && iv.length === 16, 'No IV header, is file truncated?');
    const decipher = crypto_1.createDecipheriv('aes256', decryptedAesKey, iv);
    backupStream.pipe(decipher);
    const gunzip = zlib_1.createGunzip();
    decipher.pipe(gunzip);
    if (commandLine.rawOutput) {
        gunzip.pipe(process.stdout);
    }
    else {
        if (!commandLine.force) {
            const { confirm } = await inquirer_1.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: `Do you really want to restore the backup on database ${config.dbName} on host ${config.dbHost}`,
                }]);
            assertExit_1.default(confirm, 'No confirmation, exiting...');
        }
        await dbDumpProgram_1.checkDbDumpProgram(config.dbType, config.dumpProgramsDirectory);
        await dbRestoreProgram_1.restoreDb(gunzip, config);
        console.log('Restored !');
    }
};
//# sourceMappingURL=restoreBackup.js.map