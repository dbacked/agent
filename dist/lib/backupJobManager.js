"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = require("path");
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
                    reject(new Error(payload));
                }
            }
            catch (e) { }
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
//# sourceMappingURL=backupJobManager.js.map