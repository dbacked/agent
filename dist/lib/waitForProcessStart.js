"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
const log_1 = require("./log");
exports.waitForProcessStart = (childProcess) => {
    return new Promise((resolve, reject) => {
        let processStderr = '';
        log_1.default.debug('Listening on dump process stderr');
        childProcess.stderr.on('data', (data) => { processStderr += data; });
        log_1.default.debug('Listening on dump process close event');
        childProcess.on('close', (code) => {
            log_1.default.debug('Child process close event fired', { code });
            if (code !== 0) {
                reject(new error_1.DbError(processStderr));
            }
        });
        log_1.default.debug('Listening on dump process readable event');
        childProcess.stdout.once('readable', () => {
            log_1.default.debug('Child process readable event fired');
            if (childProcess.stdout.readableLength) {
                log_1.default.debug('Child process readableLength is > 0', { readableLength: childProcess.stdout.readableLength });
                resolve();
            }
        });
    });
};
//# sourceMappingURL=waitForProcessStart.js.map