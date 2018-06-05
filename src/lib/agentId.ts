import { readFile, writeFile, stat } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { hostname } from 'os';
import * as randomstring from 'randomstring';
import * as mkdirp from 'mkdirp';
import logger from './log';

export const getOrGenerateAgentId = async ({ directory }) => {
  const randomAgentId = `${hostname()}-${randomstring.generate(4)}`;
  const agentFilePath = resolve(directory, 'config.json');
  let folderStats;
  try {
    folderStats = await promisify(stat)(directory);
  } catch (e) {}
  if (folderStats && !folderStats.isDirectory()) {
    logger.warn('WARNING: Couldn\'t create config directory because it\'s not a folder, using a temporary agent id', directory);
    return randomAgentId;
  }
  if (!folderStats) {
    try {
      await promisify(mkdirp)(directory);
    } catch (e) {
      logger.warn('WARNING: Couldn\'t create config directory, using a temporary agent id', directory);
      return randomAgentId;
    }
  }
  try {
    const file = await promisify(readFile)(agentFilePath, { encoding: 'utf8' });
    const { agentId } = JSON.parse(file);
    return agentId;
  } catch (e) {
    logger.info('Couldn\'t read agent file, creating it', agentFilePath, e.code);
  }
  try {
    await promisify(writeFile)(agentFilePath, JSON.stringify({ agentId: randomAgentId }));
  } catch (e) {
    logger.warn('WARNING: Couldn\'t write new agent file at, using a temporary', agentFilePath, e.code);
  }
  return randomAgentId;
};

