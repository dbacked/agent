"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const util_1 = require("util");
const statPromise = util_1.promisify(fs_1.stat);
const chmodPromise = util_1.promisify(fs_1.chmod);
exports.fileExists = async (path) => {
    try {
        const fileStats = await statPromise(path);
        return fileStats.isFile();
    }
    catch (e) {
        return false;
    }
};
exports.waitForStreamEnd = (stream) => {
    return new Promise((resolve) => {
        stream.on('end', () => {
            resolve();
        });
    });
};
exports.chmodExec = async (path) => {
    await chmodPromise(path, '755');
};
//# sourceMappingURL=fs.js.map