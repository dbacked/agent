"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const util_1 = require("util");
const MultiStream = require("multistream");
const crypto_1 = require("crypto");
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
    return new Promise((resolve) => {
        stream.on(eventName, () => {
            resolve();
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
    console.log(filesName);
    const filesStream = filesName.sort().map((filename) => fs_1.createReadStream(filename));
    const md5 = crypto_1.createHash('md5');
    const concatenatedFileStream = new MultiStream(filesStream);
    concatenatedFileStream.pipe(md5);
    await exports.waitForStreamEnd(md5);
    return md5.digest('hex');
};
//# sourceMappingURL=fs.js.map