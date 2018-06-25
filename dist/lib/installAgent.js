"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const fs_1 = require("fs");
const mkdirp = require("mkdirp");
const inquirer_1 = require("inquirer");
const path_1 = require("path");
const isRoot = require("is-root");
const child_process_1 = require("child_process");
const log_1 = require("./log");
const dbackedApi_1 = require("./dbackedApi");
const config_1 = require("./config");
const readFilePromisified = util_1.promisify(fs_1.readFile);
const mkdirpPromisified = util_1.promisify(mkdirp);
const writeFilePromisified = util_1.promisify(fs_1.writeFile);
const copyFilePromisified = util_1.promisify(fs_1.copyFile);
const execPromisified = util_1.promisify(child_process_1.exec);
const requiredResponse = (input) => !!input || 'Required';
const saveConfig = async (configDirectory, config) => {
    try {
        await mkdirpPromisified(configDirectory);
    }
    catch (e) { }
    const filePath = path_1.resolve(configDirectory, 'config.json');
    let configContent = {};
    try {
        const fileContent = await readFilePromisified(filePath, { encoding: 'utf-8' });
        try {
            configContent = JSON.parse(fileContent);
        }
        catch (e) { }
    }
    catch (e) { }
    try {
        await writeFilePromisified(filePath, JSON.stringify(Object.assign({}, configContent, config), null, 4));
    }
    catch (e) {
        log_1.default.error('Couldn\'t save JSON config file', { filePath, error: e.message });
    }
};
const askAndCreateConfigFile = async (configDirectory, { interactive }) => {
    let config = {};
    try {
        config = await config_1.getConfigFileContent(configDirectory);
    }
    catch (e) { }
    if (interactive) {
        const responses = await inquirer_1.prompt([
            {
                type: 'input',
                name: 'apikey',
                default: config.apikey,
                async validate(apikey) {
                    dbackedApi_1.registerApiKey(apikey);
                    await dbackedApi_1.getProject();
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
                message: 'DB password: [OPTIONNAL]',
                default: config.dbPassword,
            }, {
                name: 'dbName',
                message: 'DB name:',
                default: config.dbName,
                validate: requiredResponse,
            }, {
                name: 'agentId',
                default: config.agentId,
                message: 'Server name [OPTIONNAL]',
            },
        ]);
        Object.assign(config, responses);
    }
    dbackedApi_1.registerApiKey(config.apikey);
    config.publicKey = (await dbackedApi_1.getProject()).publicKey;
    await saveConfig(configDirectory, config);
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
    log_1.default.info('Saving systemd service file', { path: '/lib/systemd/system/dbacked.service' });
    await writeFilePromisified('/lib/systemd/system/dbacked.service', service);
    log_1.default.info('Activating service');
    await execPromisified('systemctl daemon-reload');
    await execPromisified('systemctl enable --now dbacked.service');
    log_1.default.info('Service installed and stated');
};
exports.installAgent = async (commandLine) => {
    if (!isRoot()) {
        console.error('Should be executed as root to install (as we are creating a systemd service)');
        process.exit(1);
    }
    const configDirectory = '/etc/dbacked';
    await askAndCreateConfigFile(configDirectory, { interactive: !!commandLine.y });
    if (process.execPath !== '/usr/local/bin/dbacked_agent') {
        log_1.default.info('Moving binary to /usr/local/bin/dbacked_agent');
        copyFilePromisified(process.execPath, '/usr/local/bin/dbacked_agent');
    }
    if ((await execPromisified('ps --no-headers -o comm 1')).stdout === 'systemd\n') {
        await installSystemdService();
    }
    else {
        console.log('This install program only supports systemd and you are using another init system');
        console.log('Make sure /usr/local/bin/dbacked_agent is launched at startup');
    }
};
//# sourceMappingURL=installAgent.js.map