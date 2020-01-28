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
const unzip = __importStar(require("unzip-stream"));
const fs_1 = require("./fs");
const axios_1 = __importDefault(require("axios"));
const log_1 = __importDefault(require("./log"));
const mkdirp_1 = __importDefault(require("mkdirp"));
const util_1 = require("util");
const path_1 = require("path");
const mkdirpPromisifed = util_1.promisify(mkdirp_1.default);
const needToDownloadDumpProgram = async (type, dumpProgramDirectory) => {
    log_1.default.debug('Getting dump programs MD5', { path: dumpProgramDirectory });
    await mkdirpPromisifed(dumpProgramDirectory);
    const existingMd5 = await fs_1.computeFolderContentMd5(dumpProgramDirectory);
    const remoteMd5Url = {
        mysql: 'https://dl.dbacked.com/mysql_md5',
        pg: 'https://dl.dbacked.com/postgres_md5',
        mongodb: 'https://dl.dbacked.com/mongodb_md5',
    }[type];
    log_1.default.debug('Got dump programs MD5', { md5: existingMd5 });
    log_1.default.debug('Getting remote dump programs MD5');
    const remoteMd5 = await axios_1.default.get(remoteMd5Url);
    log_1.default.debug('Got remote programs MD5', { md5: remoteMd5.data });
    return existingMd5 !== remoteMd5.data;
};
exports.checkDbDumpProgram = async (type, directory) => {
    const dumpProgramDirectory = path_1.resolve(directory, `${type}_dumper`);
    log_1.default.debug('Testing if db dump program exists at', {
        path: dumpProgramDirectory,
    });
    if (await needToDownloadDumpProgram(type, dumpProgramDirectory)) {
        log_1.default.debug('Downloading dump programs', { path: dumpProgramDirectory });
        const fileUrl = {
            mysql: 'https://dl.dbacked.com/mysql.zip',
            pg: 'https://dl.dbacked.com/postgres.zip',
            mongodb: 'https://dl.dbacked.com/mongodb.zip',
        }[type];
        log_1.default.info('Downloading db dump program at url', { url: fileUrl });
        const response = await axios_1.default.get(fileUrl, {
            responseType: 'stream',
        });
        const unzipper = unzip.Extract({ path: dumpProgramDirectory });
        response.data.pipe(unzipper);
        await fs_1.waitForStreamEnd(unzipper, 'close');
        log_1.default.info('Finished downloading db dumpprogram');
        await fs_1.chmodExec(path_1.resolve(dumpProgramDirectory, 'dump'));
        await fs_1.chmodExec(path_1.resolve(dumpProgramDirectory, 'restore'));
    }
};
//# sourceMappingURL=dbDumpProgram.js.map