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
const path_1 = require("path");
const fs_1 = require("fs");
const https_1 = require("https");
const fs_2 = require("./fs");
const request_1 = require("./request");
const constants_1 = require("./constants");
exports.getAgentPath = () => {
    const directory = path_1.resolve(process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'], '.dbacked');
    const agentPath = path_1.resolve(directory, 'agent');
    return agentPath;
};
const downloadAgent = (path) => __awaiter(this, void 0, void 0, function* () {
    const fileUrl = constants_1.AGENT_URL;
    const response = yield new Promise((resolvePromise, reject) => {
        https_1.get(fileUrl, resolvePromise).on('error', reject);
    });
    response.pipe(fs_1.createWriteStream(path));
    yield fs_2.waitForStreamEnd(response);
});
exports.checkAgentFile = (retryCount = 0) => __awaiter(this, void 0, void 0, function* () {
    const agentPath = exports.getAgentPath();
    try {
        const agentMd5 = yield request_1.getFileHttps(constants_1.AGENT_MD5_URL);
        if (yield fs_2.fileExists(agentPath)) {
            const existingAgentMd5 = yield fs_2.getFileMd5(agentPath);
            if (existingAgentMd5 !== agentMd5) {
                yield downloadAgent(agentPath);
            }
        }
        else {
            yield downloadAgent(agentPath);
        }
        yield fs_2.chmodExec(agentPath);
        const downloadedAgentMd5 = yield fs_2.getFileMd5(agentPath);
        if (downloadedAgentMd5 !== agentMd5) {
            throw new Error('Downloaded agent md5 does not match provided md5');
        }
    }
    catch (e) {
        if (retryCount >= 1) {
            throw e;
        }
        return exports.checkAgentFile(retryCount + 1);
    }
});
//# sourceMappingURL=agentFile.js.map