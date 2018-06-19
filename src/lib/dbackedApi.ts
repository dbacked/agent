import axios, { AxiosInstance } from 'axios';

import { API_ROOT } from './config';

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

