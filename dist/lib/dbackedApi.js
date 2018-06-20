"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const constants_1 = require("./constants");
const delay_1 = require("./delay");
const log_1 = require("./log");
let api;
exports.registerApiKey = (apikey) => {
    api = axios_1.default.create({
        baseURL: constants_1.API_ROOT,
        headers: {
            Authorization: `ApiKey ${apikey}`,
        },
    });
};
exports.getProject = async () => {
    try {
        const { data } = await api.get('projects/own');
        return data;
    }
    catch (e) {
        if (e.response && e.response.data && e.response.data.status === 401) {
            throw new Error('Invalid API key');
        }
        console.log(e);
        throw new Error('Unknow error while identifing to the DBacked server');
    }
};
exports.createBackup = async ({ agentId, publicKey, dbType, }) => {
    const { data } = await api.post('projects/own/backups', {
        agentId,
        agentVersion: constants_1.VERSION.join('.'),
        publicKey,
        dbType,
    });
    return data;
};
exports.waitForBackup = async (config) => {
    while (true) {
        try {
            const backupInfo = await exports.createBackup(config);
            return backupInfo;
        }
        catch (e) {
            if (e.response && e.response.data && e.response.data.message === 'No backup needed for the moment') {
                log_1.default.info('No backup needed, waiting 5 minutes');
            }
            else {
                throw e;
            }
        }
        await delay_1.delay(5 * 60 * 1000);
    }
};
exports.getUploadPartUrl = async ({ backup, partNumber, hash, agentId, }) => {
    const { data } = await api.post(`projects/${backup.projectId}/backups/${backup.id}/status`, {
        partNumber,
        agentId,
        hash,
        status: 'IN_PROGRESS',
    });
    return data;
};
exports.finishUpload = async ({ backup, partsEtag, hash, agentId, }) => {
    const { data } = await api.post(`projects/${backup.projectId}/backups/${backup.id}/status`, {
        status: 'DONE',
        partsEtag,
        hash,
        agentId,
    });
    return data;
};
exports.reportError = async ({ backup, e, agentId, }) => {
    log_1.default.info('Sending error to DBacked API');
    const error = `${e.code || (e.response && e.response.data) || e.message}\n${e.stack}`;
    await api.post(`projects/${backup.projectId}/backups/${backup.id}/status`, {
        status: 'ERROR',
        agentId,
        error,
    });
    log_1.default.info('Sent error to DBacked API');
};
//# sourceMappingURL=dbackedApi.js.map