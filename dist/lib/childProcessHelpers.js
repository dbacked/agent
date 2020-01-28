"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
const log_1 = __importDefault(require("./log"));
const delay_1 = require("./delay");
exports.createProcessWatcher = async (childProcess) => {
    let processStderr = '';
    childProcess.stderr.addListener('data', (data) => { processStderr += data; });
    const exitPromise = new Promise((resolve, reject) => {
        childProcess.addListener('close', (code) => {
            log_1.default.debug('Child process close event fired', { code, processStderr });
            if (code === 0) {
                resolve(0);
            }
            else {
                reject(new error_1.DbError(processStderr));
            }
        });
    });
    const readablePromise = new Promise((resolve) => {
        const waitForReadable = () => {
            log_1.default.debug('Child process readable event fired');
            if (childProcess.stdout.readableLength) {
                log_1.default.debug('Child process readableLength is > 0', { readableLength: childProcess.stdout.readableLength });
                childProcess.stdout.removeListener('readable', waitForReadable);
                const readed = childProcess.stdout.read();
                childProcess.stdout.unshift(readed);
                resolve();
            }
        };
        childProcess.stdout.addListener('readable', waitForReadable);
    });
    return {
        waitForStdoutStart: async () => {
            log_1.default.debug('Waiting for dump process to start writing to stdout');
            await Promise.race([exitPromise, readablePromise]);
        },
        waitForExit0: async () => {
            log_1.default.debug('Waiting for dump process to exit');
            await exitPromise;
        },
    };
};
exports.waitForProcessStart = (childProcess) => {
    return new Promise((resolve, reject) => {
        let processStderr = '';
        log_1.default.debug('Listening on dump process stderr');
        childProcess.stderr.addListener('data', (data) => { processStderr += data; });
        log_1.default.debug('Listening on dump process close event');
        childProcess.addListener('close', (code) => {
            log_1.default.debug('Child process close event fired', { code, processStderr });
            // TODO: If code is not 0, set a flag that will be tested before finishing backup
            // because the dumper can exit with an error in the middle of a backup
            if (code !== 0) {
                reject(new error_1.DbError(processStderr));
            }
        });
        log_1.default.debug('Listening on dump process readable event');
        const waitForReadable = () => {
            log_1.default.debug('Child process readable event fired');
            if (childProcess.stdout.readableLength) {
                log_1.default.debug('Child process readableLength is > 0', { readableLength: childProcess.stdout.readableLength });
                childProcess.stdout.removeListener('readable', waitForReadable);
                const readed = childProcess.stdout.read();
                childProcess.stdout.unshift(readed);
                resolve();
            }
        };
        childProcess.stdout.addListener('readable', waitForReadable);
    });
};
exports.waitForValidDumperExit = async (childProcess) => {
    childProcess.addListener('exit', (code) => {
        console.log('exited', code);
    });
    await delay_1.delay(15000);
};
//# sourceMappingURL=childProcessHelpers.js.map