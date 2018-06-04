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
      console.error('Invalid API key');
      process.exit(1);
    }
    console.error('Unknow error while identifing to the DBacked server:', e.code);
    process.exit(1);
  }
};

export const createBackup = async ({ agentId }) => {
  const { data } = await api.post('projects/own/backups', {
    agentId,
  });
  return data;
};
