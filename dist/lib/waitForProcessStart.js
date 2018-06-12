"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
exports.waitForProcessStart = (childProcess) => {
    return new Promise((resolve, reject) => {
        let processStderr = '';
        childProcess.stderr.on('data', (data) => { processStderr += data; });
        childProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new error_1.DbError(processStderr));
            }
        });
        childProcess.stdout.once('readable', () => {
            if (childProcess.stdout.readableLength) {
                resolve();
            }
        });
    });
};
//# sourceMappingURL=waitForProcessStart.js.map