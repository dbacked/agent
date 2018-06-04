import { readFile, writeFile, exists, stat } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { randomBytes } from 'crypto';
import * as mkdirp from 'mkdirp';
import logger from './log';

export const getOrGenerateAgentId = async ({ directory }) => {
  const randomAgentId = (await promisify(randomBytes)(32)).toString('base64');
  const agentFilePath = resolve(directory, 'config.json');
  let folderStats;
  try {
    folderStats = await promisify(stat)(directory);
  } catch (e) {}
  if (folderStats && !folderStats.isDirectory()) {
    logger.warn('WARNING: Couldn\'t create config directory at %s because it\'s not a folder, using a temporary agent id', directory);
    return randomAgentId;
  }
  if (!folderStats) {
    try {
      await promisify(mkdirp)(directory);
    } catch (e) {
      logger.warn('WARNING: Couldn\'t create config directory at %s, using a temporary agent id', directory);
      return randomAgentId;
    }
  }
  try {
    const file = await promisify(readFile)(agentFilePath, { encoding: 'utf8' });
    const { agentId } = JSON.parse(file);
    return agentId;
  } catch (e) {
    logger.info('Couldn\'t read agent file at %s, creating it', agentFilePath, e.code);
  }
  try {
    await promisify(writeFile)(agentFilePath, JSON.stringify({ agentId: randomAgentId }));
  } catch (e) {
    logger.warn('WARNING: Couldn\'t write new agent file at %s, using a temporary', agentFilePath, e.code);
  }
  return randomAgentId;
};

