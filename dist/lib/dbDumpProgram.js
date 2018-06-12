"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const axios_1 = require("axios");
const fs_1 = require("fs");
const fs_2 = require("./fs");
const log_1 = require("./log");
exports.checkDbDumpProgram = async (type, directory) => {
    const dumpProgramPath = path_1.resolve(directory, `${type}_dump`);
    log_1.default.debug('Testing if db dump program exists at', { path: dumpProgramPath });
    if (await fs_2.fileExists(dumpProgramPath)) {
        log_1.default.debug('db dump program exists at', { path: dumpProgramPath });
        return;
    }
    const fileUrl = {
        mysql: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/mysqldump',
        pg: 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/pg_dump',
    }[type];
    log_1.default.info('Downloading db dump program at url', { url: fileUrl });
    const response = await axios_1.default.get(fileUrl, {
        responseType: 'stream',
    });
    response.data.pipe(fs_1.createWriteStream(dumpProgramPath));
    await fs_2.waitForStreamEnd(response.data);
    log_1.default.info('Finished downloading db dumpprogram');
    await fs_2.chmodExec(dumpProgramPath);
};
//# sourceMappingURL=dbDumpProgram.js.map