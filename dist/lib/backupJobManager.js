"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = require("path");
const daemon = require("daemonize-process");
const lockfile = require("proper-lockfile");
const fs_1 = require("fs");
const util_1 = require("util");
const downgradeRoot = require("downgrade-root");
const dbackedApi_1 = require("./dbackedApi");
const delay_1 = require("./delay");
const log_1 = require("./log");
const config_1 = require("./config");
exports.startDatabaseBackupJob = (config, backupInfo) => {
    return new Promise((resolvePromise, reject) => {
        const runner = child_process_1.fork(path_1.resolve(__dirname, './backupRunner.js'));
        runner.send(JSON.stringify({
            type: 'startBackup',
            payload: {
                config,
                backupInfo,
            },
        }));
        let errorMessageReceived = false;
        runner.on('message', (message) => {
            try {
                const { type, payload } = JSON.parse(message);
                if (type === 'error') {
                    errorMessageReceived = true;
                    reject(payload);
                }
            }
            catch (e) { }
            ; // eslint-disable-line
        });
        runner.on('exit', (code) => {
            if (code === 0) {
                resolvePromise();
            }
            else if (!errorMessageReceived) {
                reject(new Error('Backup worker exited with an unknown error'));
            }
        });
    });
};
const mkdirPromise = util_1.promisify(fs_1.mkdir);
exports.agentLoop = async (commandLineArgs) => {
    const config = await config_1.getAndCheckConfig(commandLineArgs);
    log_1.default.info('Agent id:', { agentId: config.agentId });
    dbackedApi_1.registerApiKey(config.apikey);
    // Used to test the apiKey before daemonizing
    // TODO: if ECONREFUSED, try again 5 minutes later
    await dbackedApi_1.getProject();
    downgradeRoot();
    if (commandLineArgs.daemon) {
        const daemonName = commandLineArgs.daemonName ? `dbacked_${commandLineArgs.daemonName}` : 'dbacked';
        const lockDir = `/tmp/${daemonName}`;
        try {
            await mkdirPromise(lockDir);
        }
        catch (e) { }
        // TODO check version of daemonized process and kill it if different
        if (await lockfile.check(lockDir)) {
            log_1.default.error('A daemon is already running, use the --daemon-name params if you need to launch it multiple time');
            process.exit(1);
        }
        daemon();
        await lockfile.lock(lockDir);
    }
    while (true) {
        let backupInfo;
        try {
            log_1.default.debug('Waiting for backup job');
            backupInfo = await dbackedApi_1.waitForBackup(config);
            log_1.default.debug('Got backup job');
            await exports.startDatabaseBackupJob(config, backupInfo);
            await delay_1.delay(5 * 1000);
        }
        catch (e) {
            log_1.default.error('Error while backuping', { e });
            if (backupInfo) {
                await dbackedApi_1.reportError({
                    backup: backupInfo.backup,
                    e,
                    agentId: config.agentId,
                });
            }
            await delay_1.delay(60 * 60 * 1000); // Delay for an hour if got an error
        }
    }
};
//# sourceMappingURL=backupJobManager.js.map