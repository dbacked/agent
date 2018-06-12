"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const util_1 = require("util");
const crypto_1 = require("crypto");
const statPromise = util_1.promisify(fs_1.stat);
const chmodPromise = util_1.promisify(fs_1.chmod);
exports.fileExists = (path) => __awaiter(this, void 0, void 0, function* () {
    try {
        const fileStats = yield statPromise(path);
        return fileStats.isFile();
    }
    catch (e) {
        return false;
    }
});
exports.chmodExec = (path) => __awaiter(this, void 0, void 0, function* () {
    yield chmodPromise(path, '755');
});
exports.waitForStreamEnd = (stream) => {
    return new Promise((resolve) => {
        stream.on('end', () => {
            resolve();
        });
    });
};
exports.getFileMd5 = (filePath) => {
    return new Promise((resolve) => {
        const hash = crypto_1.createHash('md5');
        const stream = fs_1.createReadStream(filePath);
        stream.pipe(hash);
        hash.on('readable', () => {
            resolve(hash.read().toString('hex'));
        });
    });
};
//# sourceMappingURL=fs.js.map