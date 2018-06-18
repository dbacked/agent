import { resolve } from 'path';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs';
import { hostname } from 'os';
import * as randomstring from 'randomstring';
import * as mkdirp from 'mkdirp';
import logger from './log';
import assertExit from './assertExit';

export const API_ROOT = process.env.DBACKED_LOCAL_API ? 'http://localhost:5000' : 'https://api.dbacked.com';
export const LOG_LEVEL = 'debug';

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
  dbPassword: string;
  dbName: string;
  configDirectory: string;
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

export const getAndCheckConfig = async (commandLine) => {
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
  assertExit(config.apikey && config.apikey.length, '--apikey is required');
  assertExit(config.dbType && config.dbType.length, '--db-type is required');
  assertExit(DB_TYPE[config.dbType], '--db-type should be pg or mysql');
  assertExit(config.dbHost && config.dbHost.length, '--db-host is required');
  assertExit(config.dbUsername && config.dbUsername.length, '--db-username is required');
  assertExit(config.dbPassword && config.dbPassword.length, '--db-password is required');
  assertExit(config.dbName && config.dbName.length, '--db-name is required');

  if (!config.publicKey) {
    logger.warn('You didn\'t provide your public key via the --public-key or env varible DBACKED_PUBLIC_KEY or publicKey config key, this could expose you to a man in the middle attack on your backups');
  }

  return <Config>config;
};
