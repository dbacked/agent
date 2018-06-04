import { readFile, writeFile } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { randomBytes } from 'crypto';

export const getOrGenerateAgentId = async () => {
  const agentFilePath = resolve(
    process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'],
    '.dbacked',
  );
  try {
    const file = await promisify(readFile)(agentFilePath, { encoding: 'utf8' });
    const { agentId } = JSON.parse(file);
    return agentId;
  } catch (e) {
    console.log('Couldn\'t read agent file at %s, creating it', agentFilePath, e.code);
  }
  const agentId = (await promisify(randomBytes)(32)).toString('base64');
  try {
    await promisify(writeFile)(agentFilePath, JSON.stringify({ agentId }));
  } catch (e) {
    console.log('WARNING: Couldn\'t write new agent file at %s, using a temporary', agentFilePath, e.code);
  }
  return agentId;
};

