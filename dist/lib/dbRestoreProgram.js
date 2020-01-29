"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = require("path");
exports.restoreDb = async (stream, config) => {
    const args = {
        pg: () => {
            const pgArgs = [
                '-U', config.dbUsername, '-h', config.dbHost,
                '-d', config.dbName,
            ];
            if (!config.dbPassword) {
                pgArgs.push('--no-password');
            }
            return pgArgs;
        },
        mysql: () => {
            const mysqlArgs = [
                '-u', config.dbUsername, '-h', config.dbHost,
            ];
            if (config.dbPassword) {
                mysqlArgs.push(`--password=${config.dbPassword}`);
            }
            mysqlArgs.push(config.dbName);
            return mysqlArgs;
        },
        mongodb: () => {
            const mongodbArgs = [
                '--uri', config.dbConnectionString,
                '--archive',
            ];
            return mongodbArgs;
        },
    }[config.dbType]();
    const restoreProcess = await child_process_1.spawn(path_1.resolve(config.databaseToolsDirectory, `${config.dbType}_dumper`, 'restore'), args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: Object.assign(Object.assign({}, process.env), { PGPASSWORD: config.dbPassword, LD_LIBRARY_PATH: path_1.resolve(config.databaseToolsDirectory, `${config.dbType}_dumper`) }),
    });
    // TODO: add a percentage indicator
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