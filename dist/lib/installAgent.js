"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const config_1 = require("./config");
const is_root_1 = __importDefault(require("is-root"));
const log_1 = __importDefault(require("./log"));
const util_1 = require("util");
const writeFilePromisified = util_1.promisify(fs_1.writeFile);
const copyFilePromisified = util_1.promisify(fs_1.copyFile);
const execPromisified = util_1.promisify(child_process_1.exec);
const stopPreviousSystemdService = async () => {
    try {
        await execPromisified('systemctl stop dbacked.service');
    }
    catch (e) { }
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
    log_1.default.info('Saving systemd service file', {
        path: '/lib/systemd/system/dbacked.service',
    });
    await writeFilePromisified('/lib/systemd/system/dbacked.service', service);
    log_1.default.info('Activating service');
    await execPromisified('systemctl daemon-reload');
    await execPromisified('systemctl enable --now dbacked.service');
    log_1.default.info('Service installed and started');
};
exports.installAgent = async (commandLine) => {
    if (!is_root_1.default()) {
        console.error('Should be executed as root to install (as we are creating a systemd service)');
        process.exit(1);
    }
    await config_1.getConfig(commandLine, {
        interactive: !commandLine.y,
        saveOnDisk: true,
    });
    let isSystemd = false;
    try {
        isSystemd =
            (await execPromisified('ps --no-headers -o comm 1')).stdout ===
                'systemd\n';
    }
    catch (e) { }
    if (isSystemd) {
        await stopPreviousSystemdService();
    }
    if (process.execPath !== '/usr/local/bin/dbacked') {
        log_1.default.info('Moving binary to /usr/local/bin/dbacked');
        copyFilePromisified(process.execPath, '/usr/local/bin/dbacked');
    }
    if (isSystemd) {
        await installSystemdService();
    }
    else {
        console.log('This install program only supports systemd and you are using another init system');
        console.log('Make sure "/usr/local/bin/dbacked start-agent" is launched at startup');
    }
    console.log('Congratulation! DBacked is now installed!');
};
//# sourceMappingURL=installAgent.js.map