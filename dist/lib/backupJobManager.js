"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = require("path");
const daemon = __importStar(require("daemonize-process"));
const lockfile = __importStar(require("proper-lockfile"));
const fs_1 = require("fs");
const util_1 = require("util");
const downgrade_root_1 = __importDefault(require("downgrade-root"));
const dbackedApi_1 = require("./dbackedApi");
const delay_1 = require("./delay");
const log_1 = __importDefault(require("./log"));
const config_1 = require("./config");
const dbStats_1 = require("./dbStats");
exports.startDatabaseBackupJob = (config, backupInfo = {}) => {
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
        runner.on('message', message => {
            try {
                const { type, payload } = JSON.parse(message);
                if (type === 'error') {
                    errorMessageReceived = true;
                    reject(payload);
                }
            }
            catch (e) { }
        });
        runner.on('exit', code => {
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
    const config = await config_1.getConfig(commandLineArgs);
    log_1.default.info('Agent id:', { agentId: config.agentId });
    // Daemonize process if needed
    if (config.daemon) {
        const daemonName = config.daemonName
            ? `dbacked_${config.daemonName}`
            : 'dbacked';
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
    downgrade_root_1.default();
    if (config.subscriptionType === config_1.SUBSCRIPTION_TYPE.free) {
        await dbStats_1.initDatabase(config.dbType, config);
    }
    // Main loop, blocking until a backup is needed
    while (true) {
        let backupInfo;
        try {
            log_1.default.debug('Waiting for backup job');
            if (config.subscriptionType === config_1.SUBSCRIPTION_TYPE.pro) {
                backupInfo = await dbackedApi_1.waitForNextBackupNeededFromAPI(config);
                log_1.default.debug('Got backup job');
                await exports.startDatabaseBackupJob(config, backupInfo);
            }
            else if (config.subscriptionType === config_1.SUBSCRIPTION_TYPE.free) {
                await dbStats_1.waitForNextBackupNeededFromDatabase(config);
                log_1.default.debug('Got backup job');
                await exports.startDatabaseBackupJob(config);
            }
            await delay_1.delay(5 * 1000);
        }
        catch (e) {
            log_1.default.error('Error while backing up', { e });
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