import { promisify } from 'util';
import { writeFile, readFile, copyFile } from 'fs';
import * as mkdirp from 'mkdirp';
import { resolve } from 'path';
import * as isRoot from 'is-root';
import { exec } from 'child_process';

import logger from './log';
import { registerApiKey, getProject } from './dbackedApi';
import { getConfig, askForConfig } from './config';

const readFilePromisified = promisify(readFile);
const mkdirpPromisified = promisify(mkdirp);
const writeFilePromisified = promisify(writeFile);
const copyFilePromisified = promisify(copyFile);
const execPromisified = promisify(exec);


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
    logger.error('Couldn\'t save JSON config file', { filePath, error: e.message });
  }
};

const askAndCreateConfigFile = async (sourceConfig, { interactive }) => {
  const config:any = Object.assign({}, sourceConfig);
  if (interactive) {
    const responses = await askForConfig(config);
    Object.assign(config, responses);
  }
  registerApiKey(config.apikey);
  config.publicKey = (await getProject()).publicKey;
  await saveConfig(config.configDirectory, config);
  return config;
};

const installSystemdService = async () => {
  const service = `
[Unit]
Description=DBacked agent

[Service]
Type=simple
ExecStart=/usr/local/bin/dbacked start-agent

StandardInput=null
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=dbacked
Restart=always

[Install]
WantedBy=multi-user.target
`;
  logger.info('Saving systemd service file', { path: '/lib/systemd/system/dbacked.service' });
  await writeFilePromisified('/lib/systemd/system/dbacked.service', service);
  logger.info('Activating service');
  await execPromisified('systemctl daemon-reload');
  await execPromisified('systemctl enable --now dbacked.service');
  logger.info('Service installed and started');
};

export const installAgent = async (commandLine) => {
  if (!isRoot()) {
    console.error('Should be executed as root to install (as we are creating a systemd service)');
    process.exit(1);
  }
  const config = await getConfig(commandLine);
  await askAndCreateConfigFile(config, { interactive: !commandLine.y });

  if (process.execPath !== '/usr/local/bin/dbacked') {
    logger.info('Moving binary to /usr/local/bin/dbacked');
    copyFilePromisified(process.execPath, '/usr/local/bin/dbacked');
  }
  if ((await execPromisified('ps --no-headers -o comm 1')).stdout === 'systemd\n') {
    await installSystemdService();
  } else {
    console.log('This install program only supports systemd and you are using another init system');
    console.log('Make sure /usr/local/bin/dbacked is launched at startup');
  }
};

