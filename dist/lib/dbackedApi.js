"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const constants_1 = require("./constants");
const delay_1 = require("./delay");
const log_1 = __importDefault(require("./log"));
const dbStats_1 = require("./dbStats");
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
exports.createBackup = async ({ agentId, dbType, }) => {
    const { data } = await api.post('projects/own/backups', {
        agentId,
        agentVersion: constants_1.VERSION.join('.'),
        dbType,
    });
    return data;
};
exports.waitForNextBackupNeededFromAPI = async (config) => {
    while (true) {
        try {
            const backupInfo = await exports.createBackup(config);
            return backupInfo;
        }
        catch (e) {
            if (e.response && e.response.data && e.response.data.message === 'No backup needed for the moment') {
                log_1.default.info('No backup needed, waiting 5 minutes', { details: e.response.data.details });
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
exports.finishUpload = async ({ backup, partsEtag, hash, agentId, publicKey, }) => {
    const { data } = await api.post(`projects/${backup.projectId}/backups/${backup.id}/status`, {
        status: 'DONE',
        partsEtag,
        hash,
        agentId,
        publicKey,
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
exports.getBackupDownloadUrl = async (backup) => {
    const { data } = await api.get(`projects/${backup.projectId}/backups/${backup.id}/downloadUrl`);
    return data.downloadUrl;
};
exports.sendBackupBeacon = async (config) => {
    if (!config.email) {
        return;
    }
    const { dbId } = await dbStats_1.getDatabaseBackupStatus(config.dbType, config);
    await axios_1.default.put(`${constants_1.API_ROOT}/backupChecks`, {
        dbId,
        email: config.email,
        version: constants_1.VERSION.join('.'),
        cron: config.cron,
    });
};
exports.sendAnalytics = async (config, { timing, size }) => {
    if (!config.sendAnalytics) {
        return;
    }
    await axios_1.default.put(`${constants_1.API_ROOT}/backupAnalytics`, {
        dbType: config.dbType,
        version: constants_1.VERSION.join('.'),
        cron: config.cron,
        usingDumperOptions: !!config.dumperOptions,
        subscriptionType: config.subscriptionType,
        databaseIsLocal: config.dbHost === 'localhost' || config.dbHost === '127.0.0.1',
        size,
        time: timing,
    });
};
//# sourceMappingURL=dbackedApi.js.map