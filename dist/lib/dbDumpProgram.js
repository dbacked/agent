"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const axios_1 = require("axios");
const unzip = require("unzip-stream");
const mkdirp = require("mkdirp");
const util_1 = require("util");
const fs_1 = require("./fs");
const log_1 = require("./log");
const mkdirpPromisifed = util_1.promisify(mkdirp);
const needToDownloadDumpProgram = async (type, dumpProgramDirectory) => {
    await mkdirpPromisifed(dumpProgramDirectory);
    const existingMd5 = await fs_1.computeFolderContentMd5(dumpProgramDirectory);
    const remoteMd5Url = {
        mysql: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/mysql_md5',
        pg: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/postgres_md5',
    }[type];
    const remoteMd5 = (await axios_1.default.get(remoteMd5Url)).toString();
    return existingMd5 !== remoteMd5;
};
exports.checkDbDumpProgram = async (type, directory) => {
    const dumpProgramDirectory = path_1.resolve(directory, `${type}_dumper`);
    log_1.default.debug('Testing if db dump program exists at', { path: dumpProgramDirectory });
    if (await needToDownloadDumpProgram(type, dumpProgramDirectory)) {
        log_1.default.debug('Downloading dump programs', { path: dumpProgramDirectory });
        const fileUrl = {
            mysql: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/mysql.zip',
            pg: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/postgres.zip',
        }[type];
        log_1.default.info('Downloading db dump program at url', { url: fileUrl });
        const response = await axios_1.default.get(fileUrl, {
            responseType: 'stream',
        });
        response.data.pipe(unzip.Extract({ path: dumpProgramDirectory }));
        await fs_1.waitForStreamEnd(response.data);
        log_1.default.info('Finished downloading db dumpprogram');
        await fs_1.chmodExec(path_1.resolve(dumpProgramDirectory, 'dump'));
    }
};
//# sourceMappingURL=dbDumpProgram.js.map