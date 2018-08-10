import { resolve } from 'path';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs';
import { hostname } from 'os';
import { prompt } from 'inquirer';
import * as forge from 'node-forge';
import * as randomstring from 'randomstring';
import * as mkdirp from 'mkdirp';
import * as cronParser from 'cron-parser';

import { fromPairs, snakeCase, kebabCase } from 'lodash';
import { getProject, registerApiKey } from './dbackedApi';
import logger from './log';
import { getDatabaseBackupableInfo } from './dbStats';
import { getBucketInfo } from './s3';
import { formatDatabaseBackupableInfo } from './helpers';

export enum DB_TYPE {
  pg = 'pg',
  mysql = 'mysql',
  mongodb = 'mongodb',
}

export enum SUBSCRIPTION_TYPE {
  free = 'free',
  premium = 'premium',
}

export interface Config {
  publicKey: string;
  // Storage config
  subscriptionType: SUBSCRIPTION_TYPE;
  apikey?: string;
  s3accessKeyId?: string;
  s3secretAccessKey?: string;
  s3region?: string;
  s3bucket?: string;
  // DB info
  dbType: DB_TYPE;
  dbHost?: string;
  dbPort?: string;
  dbUsername?: string;
  dbPassword?: string;
  dbName?: string;
  dbConnectionString?: string;
  // Agent config
  agentId: string;
  configDirectory: string;
  dumpProgramsDirectory: string;
  dumperOptions?: string;
  cron?: string;
}

const configFields = [
  {
    name: 'subscriptionType',
    desc: 'What version of DBacked do you want to use?',
    options: [{ name: 'DBacked Free', value: 'free' }, { name: 'DBacked Pro', value: 'premium' }],
    required: true,
  },
  { name: 'agentId', desc: 'Server name', default: `${hostname()}-${randomstring.generate(4)}` },
  { name: 'configDirectory', desc: 'Configuration directory', default: '/etc/dbacked' },
  { name: 'dumpProgramsDirectory', desc: 'Database dumper and restorer download location', default: '/tmp/dbacked_dumpers' },
  {
    name: 'apikey',
    desc: 'DBacked API key',
    if: ({ subscriptionType }: Config) => subscriptionType === 'premium',
    validate: async (config: Config) => {
      registerApiKey(config.apikey);
      await getProject();
      return true;
    },
  }, {
    name: 's3accessKeyId',
    desc: 'S3 Access Key ID',
    if: ({ subscriptionType }: Config) => subscriptionType === 'free',
    required: true,
  }, {
    name: 's3secretAccessKey',
    desc: 'S3 Secret Access Key',
    type: 'password',
    if: ({ subscriptionType }: Config) => subscriptionType === 'free',
    required: true,
  }, {
    name: 's3region',
    desc: 'S3 Region',
    if: ({ subscriptionType }: Config) => subscriptionType === 'free',
    // TODO: validate region
    required: true,
  }, {
    name: 's3bucket',
    desc: 'S3 Bucket',
    if: ({ subscriptionType }: Config) => subscriptionType === 'free',
    required: true,
    validate: async (config: Config) => {
      const {
        s3accessKeyId, s3secretAccessKey, s3region, s3bucket,
      } = config;
      try {
        await getBucketInfo({
          s3accessKeyId, s3secretAccessKey, s3bucket, s3region,
        });
        return true;
      } catch (e) {
        return `Error from S3: ${e.toString()}`;
      }
    },
  }, {
    name: 'publicKey',
    type: 'editor',
    required: true,
    desc: 'RSA Public Key to encrypt the backups',
    validate: (config: Config) => {
      const { publicKey } = config;
      try {
        forge.pki.publicKeyFromPem(publicKey);
        return true;
      } catch (e) {
        return `Error while testing public key: ${e.toString()}`;
      }
    },
  },
  {
    name: 'dbType',
    desc: 'Database type',
    options: [
      { name: 'PostgreSQL', value: 'pg' },
      { name: 'MySQL', value: 'mysql' },
      { name: 'MongoDB', value: 'mongodb' },
    ],
    required: 'true',
  },
  {
    name: 'dbConnectionString',
    desc: 'Database connection string (starts with mongodb://)',
    if: ({ dbType }: Config) => dbType === 'mongodb',
  },
  { name: 'dbHost', desc: 'Database Host', if: ({ dbType }: Config) => dbType !== 'mongodb' },
  { name: 'dbPort', desc: 'Database Port', if: ({ dbType }: Config) => dbType !== 'mongodb' },
  {
    name: 'dbUsername',
    desc: 'Database username',
    required: true,
    if: ({ dbType }: Config) => dbType !== 'mongodb',
  }, {
    name: 'dbPassword',
    desc: 'Database password',
    type: 'password',
    if: ({ dbType }: Config) => dbType !== 'mongodb',
  }, {
    name: 'dbName',
    desc: 'Database name',
    required: true,
    validate: async (config: Config) => {
      try {
        const databaseBackupableInfo = await getDatabaseBackupableInfo(config.dbType, config);
        console.log('\nDBacked will backup these tables: (lines counts are an estimate)');
        console.log(formatDatabaseBackupableInfo(databaseBackupableInfo));
        return true;
      } catch (e) {
        return `Error while connecting to database: ${e.toString()}`;
      }
    },
  },
  { name: 'dumperOptions', desc: 'Command line option to set on pg_dump, mongodump or mysqldump' },
  {
    name: 'cron',
    desc: 'When do you want to start the backups? (UTC Cron Expression)',
    if: ({ subscriptionType }: Config) => subscriptionType === 'free',
    validate: (config: Config) => {
      try {
        cronParser.parseExpression(config.cron);
        return true;
      } catch (e) {
        return `Error while parsing cron expression: ${e.toString()}`;
      }
    },
  },
];

const readFilePromisified = promisify(readFile);
export const getConfigFileContent = async (configDirectory) => {
  const filePath = resolve(configDirectory, 'config.json');
  const fileContent = await readFilePromisified(filePath, { encoding: 'utf-8' });
  return JSON.parse(fileContent);
};

// Create a new object from merge of both config object
const mergeConfigs = (...configs) => {
  // Merge without undefined values
  return <Config> Object.assign({}, ...configs.map((x) =>
    Object.entries(x)
      .filter(([, value]) => value !== undefined)
      .reduce((obj, [key, value]) => {
        obj[key] = value; // eslint-disable-line
        return obj;
      }, {})));
};

const mkdirpPromisified = promisify(mkdirp);
const writeFilePromisified = promisify(writeFile);
const saveConfig = async (config: Config) => {
  try {
    await mkdirpPromisified(config.configDirectory);
  } catch (e) {} // eslint-disable-line
  const filePath = resolve(config.configDirectory, 'config.json');
  try {
    await writeFilePromisified(filePath, JSON.stringify(config, null, 4));
  } catch (e) {
    logger.error('Couldn\'t save JSON config file', { filePath, error: e.message });
  }
};

const askForConfig = async (inferredConfig) => {
  const answers:any = {};
  for (const configField of configFields) {
    if (configField.if && !configField.if(mergeConfigs(inferredConfig, answers))) {
      continue;
    }
    const answer = <any> await prompt(<any>{
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
          return configField.validate(<any>mergeConfigs(
            inferredConfig,
            answers,
            { [configField.name]: res },
          ));
        }
        return true;
      },
    });
    answers[configField.name] = answer.res;
  }
  return mergeConfigs(inferredConfig, answers);
};

const checkConfig = async (config: Config) => {
  const errors = [];
  for (const configField of configFields) {
    let error;
    if (configField.if && !configField.if(config)) {
      continue;
    }
    if (configField.required && !config[configField.name]) {
      error = 'Required';
    } else if (configField.validate) {
      const validateResult = await configField.validate(<any>config);
      if (validateResult !== true) {
        error = validateResult || 'Parsing error';
      }
    }
    if (error) {
      errors.push(`Error with '${configField.name}': ${error} (configurable with DBACKED_${snakeCase(configField.name).toUpperCase()} env variable, --${kebabCase(configField.name)} command line arg of ${configField.name} config variable)`);
    }
  }
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
};

export const getConfig = async (
  commandLine,
  { interactive = false, saveOnDisk = false } = {},
) => {
  let config : any = {
    configDirectory: commandLine.configDirectory || '/etc/dbacked',
  };
  try {
    const configFileContent = await getConfigFileContent(config.configDirectory);
    config = mergeConfigs(config, configFileContent);
  } catch (e) {} // eslint-disable-line
  // Get config from env variables
  config = mergeConfigs(config, fromPairs(configFields.map(({ name }) => [
    name,
    process.env[`DBACKED_${snakeCase(name).toUpperCase()}`],
  ])));
  // Get config from commandLine
  config = mergeConfigs(config, fromPairs(configFields.map(({ name }) => [
    name,
    commandLine[kebabCase(name)],
  ])));
  if (interactive) {
    config = await askForConfig(config);
  }
  await checkConfig(config);
  if (saveOnDisk) {
    await saveConfig(config);
  }
  return <Config>config;
};

