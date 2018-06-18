import { resolve } from 'path';
import { createWriteStream } from 'fs';
import { get } from 'https';
import { IncomingMessage } from 'http';

import { fileExists, waitForStreamEnd, chmodExec, getFileMd5 } from './fs';
import { getFileHttps } from './request';
import { AGENT_URL, AGENT_MD5_URL } from './constants';

export const getAgentDirectory = () => {
  const directory = resolve(
    process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'],
    '.dbacked',
  );
  return directory;
};

export const getAgentPath = () => {
  const directory = getAgentDirectory();
  const agentPath = resolve(directory, 'agent');
  return agentPath;
};

const downloadAgent = async (path) => {
  const fileUrl = AGENT_URL;
  const response = await new Promise<IncomingMessage>((resolvePromise, reject) => {
    get(fileUrl, resolvePromise).on('error', reject);
  });
  response.pipe(createWriteStream(path));
  await waitForStreamEnd(response);
};

export const checkAgentFile = async (retryCount = 0) => {
  const agentPath = getAgentPath();
  try {
    const agentMd5 = await getFileHttps(AGENT_MD5_URL);
    if (await fileExists(agentPath)) {
      const existingAgentMd5 = await getFileMd5(agentPath);
      if (existingAgentMd5 !== agentMd5) {
        await downloadAgent(agentPath);
      }
    } else {
      await downloadAgent(agentPath);
    }
    await chmodExec(agentPath);
    const downloadedAgentMd5 = await getFileMd5(agentPath);
    if (downloadedAgentMd5 !== agentMd5) {
      throw new Error('Downloaded agent md5 does not match provided md5');
    }
  } catch (e) {
    if (retryCount >= 1) {
      throw e;
    }
    return checkAgentFile(retryCount + 1);
  }
};
