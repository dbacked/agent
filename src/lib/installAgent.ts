import { promisify } from 'util';
import { writeFile, readFile, copyFile } from 'fs';
import * as mkdirp from 'mkdirp';
import { prompt } from 'inquirer';
import { resolve } from 'path';
import * as isRoot from 'is-root';
import { exec } from 'child_process';

import logger from './log';
import { registerApiKey, getProject } from './dbackedApi';
import { getConfigFileContent } from './config';

const readFilePromisified = promisify(readFile);
const mkdirpPromisified = promisify(mkdirp);
const writeFilePromisified = promisify(writeFile);
const copyFilePromisified = promisify(copyFile);
const execPromisified = promisify(exec);

const requiredResponse = (input) => !!input || 'Required';

const saveConfig = async (configDirectory, config) => {
  try {
    await mkdirpPromisified(configDirectory);
  } catch (e) {}
  const filePath = resolve(configDirectory, 'config.json');
  let configContent:any = {};
  try {
    const fileContent = await readFilePromisified(filePath, { encoding: 'utf-8' });
    try {
      configContent = JSON.parse(fileContent);
    } catch (e) {}
  } catch (e) {}
  try {
    await writeFilePromisified(filePath, JSON.stringify(Object.assign({}, configContent, config), null, 4));
  } catch (e) {
    logger.error('Couldn\'t save JSON config file, using temp agentId', { filePath, error: e.message });
  }
};

const askAndCreateConfigFile = async (configDirectory) => {
  let configFileContent:any = {};
  try {
    configFileContent = await getConfigFileContent(configDirectory);
  } catch (e) {}
  const config = await prompt([
    {
      type: 'input',
      name: 'apikey',
      default: configFileContent.apikey,
      async validate(apikey) {
        registerApiKey(apikey);
        await getProject();
        return true;
      },
    }, {
      type: 'list',
      name: 'dbType',
      default: configFileContent.dbType,
      message: 'DB type:',
      choices: ['pg', 'mysql'],
    }, {
      name: 'dbHost',
      message: 'DB host:',
      default: configFileContent.dbHost,
      validate: requiredResponse,
    }, {
      name: 'dbUsername',
      message: 'DB username:',
      default: configFileContent.dbUsername,
      validate: requiredResponse,
    }, {
      name: 'dbPassword',
      message: 'DB password:',
      default: configFileContent.dbPassword,
      validate: requiredResponse,
    }, {
      name: 'dbName',
      message: 'DB name:',
      default: configFileContent.dbName,
      validate: requiredResponse,
    }, {
      name: 'agentId',
      default: configFileContent.agentId,
      message: 'Server name [OPTIONNAL]',
    },
  ]);
  config.publicKey = (await getProject()).publicKey;
  await saveConfig(configDirectory, config);
  return config;
};

const installSystemdService = async () => {
  const service = `
[Unit]
Description=DBacked agent

[Service]
Type=simple
ExecStart=/usr/local/bin/dbacked_agent

StandardInput=null
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=DBacked
Restart=always

[Install]
WantedBy=multi-user.target
`;
  logger.info('Saving systemd service file', { path: '/lib/systemd/system/dbacked.service' });
  await writeFilePromisified('/lib/systemd/system/dbacked.service', service);
  logger.info('Activating service');
  await execPromisified('systemctl daemon-reload');
  await execPromisified('systemctl enable --now dbacked.service');
  logger.info('Service installed and stated');
};

export const installAgent = async (commandLine) => {
  if (!isRoot()) {
    console.error('Should be executed as root to install (as we are creating a systemd service)');
    process.exit(1);
  }
  const configDirectory = commandLine.configDirectory || '/etc/dbacked';
  await askAndCreateConfigFile(configDirectory);

  if (process.execPath !== '/usr/local/bin/dbacked_agent') {
    logger.info('Moving binary to /usr/local/bin/dbacked_agent');
    copyFilePromisified(process.execPath, '/usr/local/bin/dbacked_agent');
  }
  if ((await execPromisified('ps --no-headers -o comm 1')).stdout === 'systemd\n') {
    await installSystemdService();
  } else {
    console.log('This install program only supports systemd and you are using another init system');
    console.log('Make sure /usr/local/bin/dbacked_agent is launched at startup');
  }
};

