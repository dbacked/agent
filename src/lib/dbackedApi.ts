import axios, { AxiosInstance } from 'axios';

import { API_ROOT } from './config';
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
  agentId, agentVersion, publicKey, dbType,
}) => {
  const { data } = await api.post('projects/own/backups', {
    agentId,
    agentVersion,
    publicKey,
    dbType,
  });
  return data;
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
  backup, partsEtag, hash, agentId,
}) => {
  const { data } = await api.post(`projects/${backup.projectId}/backups/${backup.id}/status`, {
    status: 'DONE',
    partsEtag,
    hash,
    agentId,
  });
  return data;
};

export const reportError = async ({ backup, error, agentId }) => {
  try {
    logger.info('Sending error to DBacked API for alerting');
    await api.post(`projects/${backup.projectId}/backups/${backup.id}/status`, {
      status: 'ERROR',
      error,
      agentId,
    });
  } catch (e) {
    console.error(e, e.response && e.response.data);
    logger.warn('Couldn\'t send error message to dbacked server', { error: e.message });
  }
};
