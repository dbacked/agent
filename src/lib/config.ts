import { resolve } from 'path';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs';
import { hostname } from 'os';
import { prompt } from 'inquirer';
import * as randomstring from 'randomstring';
import * as mkdirp from 'mkdirp';
import logger from './log';
import assertExit from './assertExit';
import { getProject, registerApiKey } from './dbackedApi';

export enum DB_TYPE {
  pg = 'pg',
  mysql = 'mysql',
}

export interface Config {
  agentId: string;
  apikey: string;
  publicKey: string;
  dbType: DB_TYPE;
  dbHost: string;
  dbUsername: string;
  dbPassword?: string;
  dbName: string;
  configDirectory: string;
  dumpProgramsDirectory: string;
}

const readFilePromisified = promisify(readFile);
const mkdirpPromisified = promisify(mkdirp);
const writeFilePromisified = promisify(writeFile);

export const getConfigFileContent = async (configDirectory) => {
  const filePath = resolve(configDirectory, 'config.json');
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

const saveAgentId = async (config: Config) => {
  try {
    await mkdirpPromisified(config.configDirectory);
  } catch (e) {}
  const filePath = resolve(config.configDirectory, 'config.json');
  let configContent:any = {};
  try {
    const fileContent = await readFilePromisified(filePath, { encoding: 'utf-8' });
    try {
      configContent = JSON.parse(fileContent);
    } catch (e) {
      // the file is not a JSON file, do not save it and exit now
      logger.error('Couldn\'t parse JSON config file, using temp agentId', { filePath, error: e.message });
      return;
    }
  } catch (e) {}
  configContent.agentId = config.agentId;
  try {
    await writeFilePromisified(filePath, JSON.stringify(configContent, null, 4));
  } catch (e) {
    logger.error('Couldn\'t save JSON config file, using temp agentId', { filePath, error: e.message });
  }
};

export const getConfig = async (commandLine) => {
  let config:any = {
    configDirectory: commandLine.configDirectory || '/etc/dbacked',
  };
  try {
    const configFileContent = await getConfigFileContent(config.configDirectory);
    config = mergeConfig(config, configFileContent);
  } catch (e) {}
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
    config.agentId = `${hostname()}-${randomstring.generate(4)}`;
    await saveAgentId(config);
  }
  if (!config.dumpProgramsDirectory) {
    config.dumpProgramsDirectory = '/tmp/dbacked_dumpers';
  }

  return <Config>config;
};

export const getAndCheckConfig = async (commandLine) => {
  const config = await getConfig(commandLine);
  [{
    field: config.apikey, arg: '--apikey', env: 'DBACKED_APIKEY', confName: 'apikey',
  }, {
    field: config.dbType, arg: '--db-type', env: 'DBACKED_DB_TYPE', confName: 'dbType',
  }, {
    field: config.dbHost, arg: '--db-host', env: 'DBACKED_DB_HOST', confName: 'dbHost',
  }, {
    field: config.dbUsername, arg: '--db-username', env: 'DBACKED_DB_USERNAME', confName: 'dbUsername',
  }, {
    field: config.dbName, arg: '--db-name', env: 'DBACKED_DB_NAME', confName: 'dbName',
  }].forEach(({
    field, arg, env, confName,
  }) => {
    assertExit(field && field.length, `${arg}, ${env} env variable or ${confName} config field required`);
  });
  if (!config.publicKey) {
    logger.warn('You didn\'t provide your public key via the --public-key or env varible DBACKED_PUBLIC_KEY or publicKey config key, this could expose you to a man in the middle attack on your backups');
  }
  return config;
};

const requiredResponse = (input) => !!input || 'Required';

export const askForConfig = async (config) => {
  return prompt([
    {
      type: 'input',
      name: 'apikey',
      default: config.apikey,
      async validate(apikey) {
        registerApiKey(apikey);
        await getProject();
        return true;
      },
    }, {
      type: 'list',
      name: 'dbType',
      default: config.dbType,
      message: 'DB type:',
      choices: ['pg', 'mysql'],
    }, {
      name: 'dbHost',
      message: 'DB host:',
      default: config.dbHost,
      validate: requiredResponse,
    }, {
      name: 'dbUsername',
      message: 'DB username:',
      default: config.dbUsername,
      validate: requiredResponse,
    }, {
      name: 'dbPassword',
      message: 'DB password: [OPTIONAL]',
      default: config.dbPassword,
    }, {
      name: 'dbName',
      message: 'DB name:',
      default: config.dbName,
      validate: requiredResponse,
    }, {
      name: 'agentId',
      default: config.agentId,
      message: 'Server name [OPTIONAL]',
    },
  ]);
};

