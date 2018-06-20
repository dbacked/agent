"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const util_1 = require("util");
const fs_1 = require("fs");
const os_1 = require("os");
const randomstring = require("randomstring");
const mkdirp = require("mkdirp");
const log_1 = require("./log");
const assertExit_1 = require("./assertExit");
exports.API_ROOT = process.env.DBACKED_LOCAL_API ? 'http://localhost:5000' : 'https://api.dbacked.com';
var DB_TYPE;
(function (DB_TYPE) {
    DB_TYPE["pg"] = "pg";
    DB_TYPE["mysql"] = "mysql";
})(DB_TYPE = exports.DB_TYPE || (exports.DB_TYPE = {}));
const readFilePromisified = util_1.promisify(fs_1.readFile);
const mkdirpPromisified = util_1.promisify(mkdirp);
const writeFilePromisified = util_1.promisify(fs_1.writeFile);
exports.getConfigFileContent = async (configDirectory) => {
    const filePath = path_1.resolve(configDirectory, 'config.json');
    const fileContent = await readFilePromisified(filePath, { encoding: 'utf-8' });
    const content = JSON.parse(fileContent);
    return content;
};
const mergeConfig = (configSource = {}, configToApply) => {
    const fields = [
        'agentId',
        'apikey',
        'publicKey',
        'dbType',
        'dbHost',
        'dbUsername',
        'dbPassword',
        'dbName',
    ];
    const mergedConfig = Object.assign({}, configSource);
    fields.forEach((fieldName) => {
        if (configToApply[fieldName]) {
            mergedConfig[fieldName] = configToApply[fieldName];
        }
    });
    return mergedConfig;
};
const saveAgentId = async (config) => {
    try {
        await mkdirpPromisified(config.configDirectory);
    }
    catch (e) { }
    const filePath = path_1.resolve(config.configDirectory, 'config.json');
    let configContent = {};
    try {
        const fileContent = await readFilePromisified(filePath, { encoding: 'utf-8' });
        try {
            configContent = JSON.parse(fileContent);
        }
        catch (e) {
            // the file is not a JSON file, do not save it and exit now
            log_1.default.error('Couldn\'t parse JSON config file, using temp agentId', { filePath, error: e.message });
            return;
        }
    }
    catch (e) { }
    configContent.agentId = config.agentId;
    try {
        await writeFilePromisified(filePath, JSON.stringify(configContent, null, 4));
    }
    catch (e) {
        log_1.default.error('Couldn\'t save JSON config file, using temp agentId', { filePath, error: e.message });
    }
};
exports.getAndCheckConfig = async (commandLine) => {
    let config = {
        configDirectory: commandLine.configDirectory || '/etc/dbacked',
    };
    try {
        const configFileContent = await exports.getConfigFileContent(config.configDirectory);
        config = mergeConfig(config, configFileContent);
    }
    catch (e) { }
    config = mergeConfig(config, {
        apikey: process.env.DBACKED_APIKEY,
        publicKey: process.env.DBACKED_PUBLIC_KEY,
        dbType: process.env.DBACKED_DB_TYPE,
        dbHost: process.env.DBACKED_DB_HOST,
        dbUsername: process.env.DBACKED_DB_USERNAME,
        dbPassword: process.env.DBACKED_DB_PASSWORD,
        dbName: process.env.DBACKED_DB_NAME,
    });
    config = mergeConfig(config, {
        apikey: commandLine.apikey,
        publicKey: commandLine.publicKey,
        dbType: commandLine.dbType,
        dbHost: commandLine.dbHost,
        dbUsername: commandLine.dbUsername,
        dbPassword: commandLine.dbPassword,
        dbName: commandLine.dbName,
    });
    if (!config.agentId) {
        config.agentId = `${os_1.hostname()}-${randomstring.generate(4)}`;
        await saveAgentId(config);
    }
    assertExit_1.default(config.apikey && config.apikey.length, '--apikey is required');
    assertExit_1.default(config.dbType && config.dbType.length, '--db-type is required');
    assertExit_1.default(DB_TYPE[config.dbType], '--db-type should be pg or mysql');
    assertExit_1.default(config.dbHost && config.dbHost.length, '--db-host is required');
    assertExit_1.default(config.dbUsername && config.dbUsername.length, '--db-username is required');
    assertExit_1.default(config.dbName && config.dbName.length, '--db-name is required');
    if (!config.publicKey) {
        log_1.default.warn('You didn\'t provide your public key via the --public-key or env varible DBACKED_PUBLIC_KEY or publicKey config key, this could expose you to a man in the middle attack on your backups');
    }
    if (!config.dumpProgramsDirectory) {
        config.dumpProgramsDirectory = '/tmp/dbacked_dumpers';
    }
    return config;
};
//# sourceMappingURL=config.js.map