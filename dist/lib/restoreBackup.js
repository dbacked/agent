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
const s3_1 = require("./s3");
const getAvailableBackups = async (config) => {
    if (config.subscriptionType === config_1.SUBSCRIPTION_TYPE.pro) {
        const project = await dbackedApi_1.getProject();
        const availableBackups = project.backups
            .filter(({ finishedAt }) => !!finishedAt);
        return availableBackups;
    }
    else if (config.subscriptionType === config_1.SUBSCRIPTION_TYPE.free) {
        const backupsName = await s3_1.getBackupNamesFromS3(config);
        const backupsMetadata = await Promise.all(backupsName.map((backupName) => s3_1.getBackupMetadataFromS3(config, backupName)));
        return backupsMetadata
            .filter(Boolean)
            .sort((backup1, backup2) => backup2.timestamp - backup1.timestamp)
            .map(({ dbType, timestamp, size, filename, }) => ({
            dbType,
            finishedAt: luxon_1.DateTime.fromMillis(timestamp).toISO(),
            size,
            filename,
        }));
    }
    return [];
};
const getTargetBackupDownloadUrl = async (config, { useLastBackup }) => {
    const availableBackups = await getAvailableBackups(config);
    if (!availableBackups.length) {
        log_1.default.error('No backup available for this project');
        process.exit(1);
    }
    if (useLastBackup) {
        return await dbackedApi_1.getBackupDownloadUrl(availableBackups[0]);
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
    return config.subscriptionType === config_1.SUBSCRIPTION_TYPE.pro ?
        await dbackedApi_1.getBackupDownloadUrl(backup) :
        await s3_1.getS3downloadUrl(config, backup.filename);
};
const getBackupStream = async (config, { useLastBackup, useStdin }) => {
    if (useStdin) {
        return process.stdin;
    }
    const downloadUrl = await getTargetBackupDownloadUrl(config, { useLastBackup });
    const { data } = await axios_1.default({
        method: 'get',
        url: downloadUrl,
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
    if (privateKey.split('\n')[1].includes('Proc-Type: 4,ENCRYPTED') ||
        privateKey.split('\n')[0].includes('BEGIN ENCRYPTED PRIVATE KEY')) {
        const { passphrase } = await inquirer_1.prompt([{
                type: 'password',
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
    const config = await config_1.getConfig(commandLine, {
        interactive: !commandLine.y,
        filter: ({ meta }) => !meta || !meta.notForRestore,
    });
    const backupStream = await getBackupStream(config, {
        useLastBackup: commandLine.lastBackup,
        useStdin: commandLine.rawInput,
    });
    const promisifiedBackupStream = new streamToPromise_1.default(backupStream);
    // Test Magic
    promisifiedBackupStream.setSize(7);
    assertExit_1.default((await promisifiedBackupStream.next()).value.toString() === 'DBACKED', 'Invalid start of file, check for file corruption');
    // Get version
    promisifiedBackupStream.setSize(3);
    const version = [...(await promisifiedBackupStream.next()).value]; // eslint-disable-line
    promisifiedBackupStream.setSize(4);
    // Get AES key length
    const aesKeyLengthBuffer = (await promisifiedBackupStream.next()).value;
    const [aesKeyLength] = new Uint32Array(aesKeyLengthBuffer.buffer.slice(aesKeyLengthBuffer.byteOffset, aesKeyLengthBuffer.byteOffset + 4));
    // Get AES key
    promisifiedBackupStream.setSize(aesKeyLength);
    const encryptedAesKey = (await promisifiedBackupStream.next()).value;
    assertExit_1.default(encryptedAesKey && encryptedAesKey.length === aesKeyLength, 'File ends before reading aes key, no aes key header, is file truncated?');
    const decryptedAesKey = await decryptAesKey(commandLine, encryptedAesKey);
    // Get IV
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
                    message: config.dbType === 'mongodb' ?
                        `Do you really want to restore the backup on database ${config.dbConnectionString}` :
                        `Do you really want to restore the backup on database ${config.dbName} on host ${config.dbHost}`,
                }]);
            assertExit_1.default(confirm, 'No confirmation, exiting...');
        }
        await dbDumpProgram_1.checkDbDumpProgram(config.dbType, config.databaseToolsDirectory);
        console.log('Restoring backup... This can take a long time');
        await dbRestoreProgram_1.restoreDb(gunzip, config);
        console.log('Restored !');
    }
};
//# sourceMappingURL=restoreBackup.js.map