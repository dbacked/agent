"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = require("path");
exports.restoreDb = async (stream, config) => {
    let args;
    if (config.dbType === 'pg') {
        args = [
            '-U', config.dbUsername, '-h', config.dbHost,
            '-d', config.dbName,
        ];
        if (!config.dbPassword) {
            args.push('--no-password');
        }
    }
    else if (config.dbType === 'mysql') {
        args = [
            '-u', config.dbUsername, '-h', config.dbHost,
        ];
        if (config.dbPassword) {
            args.push(`--password=${config.dbPassword}`);
        }
        args.push(config.dbName);
    }
    const restoreProcess = await child_process_1.spawn(path_1.resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`, 'restore'), args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
            PGPASSWORD: config.dbPassword,
            LD_LIBRARY_PATH: path_1.resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`),
        },
    });
    stream.pipe(restoreProcess.stdin);
    await new Promise((resolvePromise, reject) => {
        restoreProcess.on('exit', (code) => {
            if (code === 0) {
                resolvePromise();
            }
            else {
                reject(new Error(restoreProcess.stderr.read().toString()));
            }
        });
    });
};
//# sourceMappingURL=dbRestoreProgram.js.map