"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const util_1 = require("util");
const fs_1 = require("fs");
const os_1 = require("os");
const inquirer_1 = require("inquirer");
const forge = require("node-forge");
const randomstring = require("randomstring");
const mkdirp = require("mkdirp");
const cronParser = require("cron-parser");
const lodash_1 = require("lodash");
const dbackedApi_1 = require("./dbackedApi");
const log_1 = require("./log");
const dbStats_1 = require("./dbStats");
const s3_1 = require("./s3");
const helpers_1 = require("./helpers");
const writeFileAsync = util_1.promisify(fs_1.writeFile);
var DB_TYPE;
(function (DB_TYPE) {
    DB_TYPE["pg"] = "pg";
    DB_TYPE["mysql"] = "mysql";
    DB_TYPE["mongodb"] = "mongodb";
})(DB_TYPE = exports.DB_TYPE || (exports.DB_TYPE = {}));
var SUBSCRIPTION_TYPE;
(function (SUBSCRIPTION_TYPE) {
    SUBSCRIPTION_TYPE["free"] = "free";
    SUBSCRIPTION_TYPE["pro"] = "pro";
})(SUBSCRIPTION_TYPE = exports.SUBSCRIPTION_TYPE || (exports.SUBSCRIPTION_TYPE = {}));
const configFields = [
    {
        name: 'subscriptionType',
        desc: 'What version of DBacked do you want to use?',
        options: [{ name: 'DBacked Free', value: 'free' }, { name: 'DBacked Pro', value: 'pro' }],
        required: true,
        default: 'free',
    }, {
        name: 'agentId',
        desc: 'Server name',
        default: `${os_1.hostname()}-${randomstring.generate(4)}`,
        meta: {
            notForRestore: true,
        },
    }, {
        name: 'configFilePath',
        desc: 'Configuration file path',
        default: '/etc/dbacked/config.json',
        meta: {
            doNotAsk: true,
        },
    }, {
        name: 'databaseToolsDirectory',
        desc: 'Database dumper and restorer download location',
        default: '/tmp/dbacked',
        meta: {
            doNotAsk: true,
        },
    }, {
        name: 'apikey',
        desc: 'DBacked API key',
        if: ({ subscriptionType }) => subscriptionType === SUBSCRIPTION_TYPE.pro,
        validate: async ({ apikey }) => {
            dbackedApi_1.registerApiKey(apikey);
            await dbackedApi_1.getProject();
            return true;
        },
    }, {
        name: 'email',
        desc: 'Email to send an alert to if no backups in 30 days [Optionnal]',
        if: ({ subscriptionType }) => subscriptionType === 'free',
        validate: ({ email }) => {
            if (email && !/\S+@\S+\.\S+/.test(email)) {
                return 'Invalid email';
            }
            return true;
        },
        meta: {
            notForRestore: true,
        },
    }, {
        name: 'generateKeyPair',
        desc: 'Backup encryption key',
        options: [{
                value: true, name: 'Generate a new key pair',
            }, {
                value: false, name: 'Use an existing public key',
            }],
        if: ({ subscriptionType, publicKey }) => !publicKey && subscriptionType === SUBSCRIPTION_TYPE.free,
        meta: {
            virtual: true,
            notForRestore: true,
        },
    }, {
        name: 'newKeyPairPassword',
        desc: 'Private key password',
        type: 'password',
        if: (config) => config.generateKeyPair,
        required: true,
        meta: {
            virtual: true,
            notForRestore: true,
        },
    }, {
        name: 'newKeyPairPasswordConfirm',
        desc: 'Private key password confirm',
        type: 'password',
        if: (config) => config.generateKeyPair,
        required: true,
        validate: (config) => {
            if (config.newKeyPairPassword !== config.newKeyPairPasswordConfirm) {
                return 'Password and confirm do not match';
            }
            return true;
        },
        transform: async ({ newKeyPairPassword }) => {
            console.log('Generating key pair, this can take some time...');
            const keypair = await util_1.promisify(forge.pki.rsa.generateKeyPair)({ bits: 4096, workers: -1 });
            const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
            const privateKeyPem = forge.pki
                .encryptRsaPrivateKey(keypair.privateKey, newKeyPairPassword);
            const privateKeyPath = path_1.resolve(process.cwd(), 'dbacked_private_key.pem');
            await writeFileAsync(privateKeyPath, privateKeyPem);
            console.log(`Saved private key to: ${privateKeyPath}`);
            return {
                publicKey: publicKeyPem,
            };
        },
        meta: {
            virtual: true,
            notForRestore: true,
        },
    }, {
        name: 'publicKey',
        type: 'editor',
        required: true,
        desc: 'RSA Public Key to encrypt the backups',
        if: (config) => !config.generateKeyPair,
        validate: ({ publicKey }) => {
            try {
                forge.pki.publicKeyFromPem(publicKey);
                return true;
            }
            catch (e) {
                return `Error while testing public key: ${e.toString()}`;
            }
        },
        meta: {
            notForRestore: true,
        },
    }, {
        name: 's3accessKeyId',
        desc: 'S3 Access Key ID',
        if: ({ subscriptionType }) => subscriptionType === SUBSCRIPTION_TYPE.free,
        required: true,
        envName: 'S3_ACCESS_KEY_ID',
        argName: 's3-access-key-id',
    }, {
        name: 's3secretAccessKey',
        desc: 'S3 Secret Access Key',
        envName: 'S3_SECRET_ACCESS_KEY',
        argName: 's3-secret-access-key',
        type: 'password',
        if: ({ subscriptionType }) => subscriptionType === SUBSCRIPTION_TYPE.free,
        required: true,
    }, {
        name: 's3region',
        envName: 'S3_REGION',
        argName: 's3-region',
        desc: 'S3 Region',
        if: ({ subscriptionType }) => subscriptionType === SUBSCRIPTION_TYPE.free,
        // TODO: validate region
        required: true,
    }, {
        name: 's3bucket',
        envName: 'S3_BUCKET',
        argName: 's3-bucket',
        desc: 'S3 Bucket',
        if: ({ subscriptionType }) => subscriptionType === SUBSCRIPTION_TYPE.free,
        required: true,
        validate: async ({ s3accessKeyId, s3secretAccessKey, s3bucket, s3region, }, interactive = false) => {
            if (interactive) {
                console.log('Testing credentials on S3...');
            }
            try {
                await s3_1.getBucketInfo({
                    s3accessKeyId, s3secretAccessKey, s3bucket, s3region,
                });
                return true;
            }
            catch (e) {
                return `Error from S3: ${e.toString()}`;
            }
        },
    }, {
        name: 'dbType',
        desc: 'Database type',
        options: [
            { name: 'PostgreSQL', value: 'pg' },
            { name: 'MySQL', value: 'mysql' },
            { name: 'MongoDB', value: 'mongodb' },
        ],
        required: true,
    },
    {
        name: 'dbConnectionString',
        desc: 'Database connection string (starts with mongodb://)',
        if: ({ dbType }) => dbType === 'mongodb',
    },
    { name: 'dbHost', desc: 'Database Host', if: ({ dbType }) => dbType !== 'mongodb' },
    { name: 'dbPort', desc: 'Database Port', if: ({ dbType }) => dbType !== 'mongodb' },
    {
        name: 'dbUsername',
        desc: 'Database username',
        required: true,
        if: ({ dbType }) => dbType !== 'mongodb',
    }, {
        name: 'dbPassword',
        desc: 'Database password',
        type: 'password',
        if: ({ dbType }) => dbType !== 'mongodb',
    }, {
        name: 'dbName',
        desc: 'Database name',
        required: true,
        if: ({ dbType }) => dbType !== 'mongodb',
        validate: async (config, interactive = false) => {
            if (interactive) {
                console.log('Testing connection to database...');
            }
            try {
                const databaseBackupableInfo = await dbStats_1.getDatabaseBackupableInfo(config.dbType, config);
                if (interactive) {
                    console.log('\nDatabase content: (lines counts are an estimate)');
                    console.log(helpers_1.formatDatabaseBackupableInfo(databaseBackupableInfo));
                }
                return true;
            }
            catch (e) {
                return `Error while connecting to database: ${e.toString()}`;
            }
        },
    }, {
        name: 'dbAlias',
        desc: 'Database alias (used for backup filename)',
        if: ({ subscriptionType }) => subscriptionType === SUBSCRIPTION_TYPE.free,
        meta: {
            notForRestore: true,
        },
    }, {
        name: 'dumperOptions',
        desc: 'Command line option to set on pg_dump, mongodump or mysqldump',
        meta: {
            notForRestore: true,
        },
    }, {
        name: 'cron',
        desc: 'When do you want to start the backups? (UTC Cron Expression)',
        if: ({ subscriptionType }) => subscriptionType === SUBSCRIPTION_TYPE.free,
        validate: ({ cron }) => {
            try {
                cronParser.parseExpression(cron);
                return true;
            }
            catch (e) {
                return `Error while parsing cron expression: ${e.toString()}`;
            }
        },
        meta: {
            notForRestore: true,
        },
    }, {
        name: 'sendAnalytics',
        // TODO: link to a page explaining which analytics are being sent
        desc: 'Authorize DBacked to send anonymized analytics?',
        if: ({ subscriptionType }) => subscriptionType === SUBSCRIPTION_TYPE.free,
        options: [{ name: 'Yes', value: true }, { name: 'No', value: false }],
        meta: {
            notForRestore: true,
        },
    }, {
        name: 'daemon',
        desc: 'Daemonize / Run backup process in background',
        meta: {
            doNotAsk: true,
        },
    }, {
        name: 'daemonName',
        desc: 'Daemon name, used to run multiple daemon of DBacked at the same time',
        meta: {
            doNotAsk: true,
        },
    },
];
const readFilePromisified = util_1.promisify(fs_1.readFile);
exports.getConfigFileContent = async (configFilePath) => {
    const fileContent = await readFilePromisified(configFilePath, { encoding: 'utf-8' });
    return JSON.parse(fileContent);
};
// Create a new object from merge of both config object
const mergeConfigs = (...configs) => {
    // Merge without undefined values
    const res = {};
    configs.forEach((config) => {
        configFields.forEach((field) => {
            if (field.meta && field.meta.virtual) {
                return;
            }
            if (config[field.name]) {
                res[field.name] = config[field.name];
            }
        });
    });
    return res;
};
// Create a new object from merge of both config object
const mergeConfigsWithVirtuals = (...configs) => {
    // Merge without undefined values
    const res = {};
    configs.forEach((config) => {
        configFields.forEach((field) => {
            if (config[field.name]) {
                res[field.name] = config[field.name];
            }
        });
    });
    return res;
};
const mkdirpPromisified = util_1.promisify(mkdirp);
const writeFilePromisified = util_1.promisify(fs_1.writeFile);
const saveConfig = async (config) => {
    try {
        await mkdirpPromisified(path_1.dirname(config.configFilePath));
    }
    catch (e) { }
    try {
        await writeFilePromisified(config.configFilePath, JSON.stringify(config, null, 4));
    }
    catch (e) {
        log_1.default.error('Couldn\'t save JSON config file', { filePath: config.configFilePath, error: e.message });
    }
};
const askForConfig = async (inferredConfig, { filter }) => {
    let answers = {};
    for (const configField of configFields) {
        if (configField.meta && configField.meta.doNotAsk) {
            continue;
        }
        if (filter && !filter(configField)) {
            continue;
        }
        if (configField.if && !configField.if(mergeConfigsWithVirtuals(inferredConfig, answers))) {
            continue;
        }
        const answer = await inquirer_1.prompt({
            type: configField.type || (configField.options ? 'list' : 'input'),
            name: 'res',
            default: inferredConfig[configField.name] || configField.default,
            message: configField.desc,
            choices: configField.options,
            validate: async (res) => {
                if (configField.required && !res) {
                    return 'Required';
                }
                if (configField.validate) {
                    return configField.validate(mergeConfigsWithVirtuals(inferredConfig, answers, { [configField.name]: res }), true);
                }
                return true;
            },
        });
        answers[configField.name] = answer.res;
        if (configField.transform) {
            answers = mergeConfigsWithVirtuals(answers, await configField.transform(mergeConfigsWithVirtuals(inferredConfig, answers)));
        }
    }
    return mergeConfigs(inferredConfig, answers);
};
const checkConfig = async (config, { filter }) => {
    const errors = [];
    for (const configField of configFields) {
        let error;
        if (filter && !filter(configField)) {
            continue;
        }
        if (configField.if && !configField.if(config)) {
            continue;
        }
        if (!config[configField.name] && configField.default) {
            config[configField.name] = configField.default; // eslint-disable-line
        }
        // TODO: check that value is in options
        if (configField.required && !config[configField.name]) {
            error = 'Required';
        }
        else if (configField.validate) {
            const validateResult = await configField.validate(config);
            if (validateResult !== true) {
                error = validateResult || 'Parsing error';
            }
        }
        if (error) {
            const envName = configField.envName || `DBACKED_${lodash_1.snakeCase(configField.name).toUpperCase()}`;
            const argName = configField.argName || `--${lodash_1.kebabCase(configField.name)}`;
            errors.push(`Error with '${configField.name}': ${error} (configurable with ${envName} env variable, ${argName} command line arg of ${configField.name} config variable)`);
        }
    }
    if (errors.length) {
        throw new Error(errors.join('\n'));
    }
};
exports.getConfig = async (commandLine, { interactive = false, saveOnDisk = false, filter = undefined } = {}) => {
    let config = {
        configFilePath: commandLine.configFilePath || '/etc/dbacked/config.json',
    };
    try {
        const configFileContent = await exports.getConfigFileContent(config.configFilePath);
        config = mergeConfigs(config, configFileContent);
    }
    catch (e) { }
    // Get config from env variables
    config = mergeConfigs(config, lodash_1.fromPairs(configFields.map(({ name, envName }) => [
        name,
        process.env[`DBACKED_${envName || lodash_1.snakeCase(name).toUpperCase()}`],
    ])));
    // Get config from commandLine
    config = mergeConfigs(config, lodash_1.fromPairs(configFields.map(({ name, argName }) => [
        name,
        commandLine[argName || lodash_1.kebabCase(name)],
    ])));
    if (interactive) {
        config = await askForConfig(config, { filter });
    }
    await checkConfig(config, { filter });
    if (saveOnDisk) {
        await saveConfig(config);
    }
    return config;
};
//# sourceMappingURL=config.js.map