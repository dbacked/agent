"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const os_1 = require("os");
const randomstring = require("randomstring");
const mkdirp = require("mkdirp");
const log_1 = require("./log");
exports.getOrGenerateAgentId = async ({ directory }) => {
    const randomAgentId = `${os_1.hostname()}-${randomstring.generate(4)}`;
    const agentFilePath = path_1.resolve(directory, 'config.json');
    let folderStats;
    try {
        folderStats = await util_1.promisify(fs_1.stat)(directory);
    }
    catch (e) { }
    if (folderStats && !folderStats.isDirectory()) {
        log_1.default.warn('WARNING: Couldn\'t create config directory because it\'s not a folder, using a temporary agent id', directory);
        return randomAgentId;
    }
    if (!folderStats) {
        try {
            await util_1.promisify(mkdirp)(directory);
        }
        catch (e) {
            log_1.default.warn('WARNING: Couldn\'t create config directory, using a temporary agent id', directory);
            return randomAgentId;
        }
    }
    try {
        const file = await util_1.promisify(fs_1.readFile)(agentFilePath, { encoding: 'utf8' });
        const { agentId } = JSON.parse(file);
        return agentId;
    }
    catch (e) {
        log_1.default.info('Couldn\'t read agent file, creating it', agentFilePath, e.code);
    }
    try {
        await util_1.promisify(fs_1.writeFile)(agentFilePath, JSON.stringify({ agentId: randomAgentId }));
    }
    catch (e) {
        log_1.default.warn('WARNING: Couldn\'t write new agent file at, using a temporary', agentFilePath, e.code);
    }
    return randomAgentId;
};
//# sourceMappingURL=agentId.js.map