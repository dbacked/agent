import axios, { AxiosInstance } from 'axios';

import { API_ROOT, VERSION } from './constants';
import { delay } from './delay';
import logger from './log';

let api: AxiosInstance;

export const registerApiKey = (apikey) => {
  api = axios.create({
    baseURL: API_ROOT,
    headers: {
      Authorization: `ApiKey ${apikey}`,
    },
  });
};

export const getProject = async () => {
  try {
    const { data } = await api.get('projects/own');
    return data;
  } catch (e) {
    if (e.response && e.response.data && e.response.data.status === 401) {
      throw new Error('Invalid API key');
    }
    console.log(e);
    throw new Error('Unknow error while identifing to the DBacked server');
  }
};

export const createBackup = async ({
  agentId, dbType,
}) => {
  const { data } = await api.post('projects/own/backups', {
    agentId,
    agentVersion: VERSION.join('.'),
    dbType,
  });
  return data;
};

export const waitForBackup = async (config) => {
  while (true) {
    try {
      const backupInfo = await createBackup(config);
      return backupInfo;
    } catch (e) {
      if (e.response && e.response.data && e.response.data.message === 'No backup needed for the moment') {
        logger.info('No backup needed, waiting 5 minutes', { details: e.response.data.details });
      } else {
        throw e;
      }
    }
    await delay(5 * 60 * 1000);
  }
};

export const getUploadPartUrl = async ({
  backup, partNumber, hash, agentId,
}) => {
  const { data } = await api.post(`projects/${backup.projectId}/backups/${backup.id}/status`, {
    partNumber,
    agentId,
    hash,
    status: 'IN_PROGRESS',
  });
  return data;
};

export const finishUpload = async ({
  backup, partsEtag, hash, agentId, publicKey,
}) => {
  const { data } = await api.post(`projects/${backup.projectId}/backups/${backup.id}/status`, {
    status: 'DONE',
    partsEtag,
    hash,
    agentId,
    publicKey,
  });
  return data;
};

export const reportError = async ({
  backup, e, agentId,
}) => {
  logger.info('Sending error to DBacked API');
  const error = `${e.code || (e.response && e.response.data) || e.message}\n${e.stack}`;
  await api.post(`projects/${backup.projectId}/backups/${backup.id}/status`, {
    status: 'ERROR',
    agentId,
    error,
  });
  logger.info('Sent error to DBacked API');
};

export const getBackupDownloadUrl = async (backup) => {
  const { data } = await api.get(`projects/${backup.projectId}/backups/${backup.id}/downloadUrl`);
  return data.downloadUrl;
};

