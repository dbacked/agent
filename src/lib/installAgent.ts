import { promisify } from 'util';
import { writeFile, copyFile } from 'fs';
import * as isRoot from 'is-root';
import { exec } from 'child_process';

import logger from './log';
import { getConfig } from './config';

const writeFilePromisified = promisify(writeFile);
const copyFilePromisified = promisify(copyFile);
const execPromisified = promisify(exec);

const stopPreviousSystemdService = async () => {
  try {
    await execPromisified('systemctl stop dbacked.service');
  } catch (e) {}
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
  logger.info('Service installed and stated');
};

export const installAgent = async (commandLine) => {
  if (!isRoot()) {
    console.error('Should be executed as root to install (as we are creating a systemd service)');
    process.exit(1);
  }
  await getConfig(commandLine, { interactive: !commandLine.y, saveOnDisk: true });
  let isSystemd = false;
  try {
    isSystemd = (await execPromisified('ps --no-headers -o comm 1')).stdout === 'systemd\n';
  } catch (e) {}
  if (isSystemd) {
    await stopPreviousSystemdService();
  }
  if (process.execPath !== '/usr/local/bin/dbacked') {
    logger.info('Moving binary to /usr/local/bin/dbacked');
    copyFilePromisified(process.execPath, '/usr/local/bin/dbacked');
  }
  if (isSystemd) {
    await installSystemdService();
  } else {
    console.log('This install program only supports systemd and you are using another init system');
    console.log('Make sure /usr/local/bin/dbacked is launched at startup');
  }
};

