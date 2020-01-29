"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const util_1 = require("util");
const MultiStream = __importStar(require("multistream"));
const crypto_1 = require("crypto");
const path_1 = require("path");
exports.readFilePromisified = util_1.promisify(fs_1.readFile);
const statPromised = util_1.promisify(fs_1.stat);
const chmodPromised = util_1.promisify(fs_1.chmod);
const readdirPromisifed = util_1.promisify(fs_1.readdir);
exports.fileExists = async (path) => {
    try {
        const fileStats = await statPromised(path);
        return fileStats.isFile();
    }
    catch (e) {
        return false;
    }
};
exports.waitForStreamEnd = (stream, eventName = 'end') => {
    return new Promise((resolvePromise) => {
        stream.on(eventName, () => {
            resolvePromise();
        });
    });
};
exports.chmodExec = async (path) => {
    await chmodPromised(path, '755');
};
exports.computeFolderContentMd5 = async (directory) => {
    const filesName = await readdirPromisifed(directory);
    if (!filesName.length) {
        return '';
    }
    const filesStream = filesName
        .sort()
        .map((filename) => fs_1.createReadStream(path_1.resolve(directory, filename)));
    const md5 = crypto_1.createHash('md5');
    const concatenatedFileStream = new MultiStream(filesStream);
    concatenatedFileStream.pipe(md5);
    await exports.waitForStreamEnd(md5, 'readable');
    return md5.read().toString('hex');
};
//# sourceMappingURL=fs.js.map