import { promisify } from 'util';
import { execFile } from 'child_process';

import { getAgentPath } from './agentFile';
import { DBackedAgentOption } from './constants';

const execFilePromisified = promisify(execFile);

export const startAgent = async (options: DBackedAgentOption) => {
  const agentPath = getAgentPath();
  const agentEnv:any = {
    DBACKED_APIKEY: options.apikey,
    DBACKED_DB_TYPE: options.dbType,
    DBACKED_DB_HOST: options.db.host,
    DBACKED_DB_USERNAME: options.db.user,
    DBACKED_DB_PASSWORD: options.db.password,
    DBACKED_DB_NAME: options.db.database,
    ...process.env,
  };
  if (options.publicKey) {
    agentEnv.DBACKED_PUBLIC_KEY = options.publicKey;
  }
  const agentArgs = ['--daemon'];
  if (options.daemonName) {
    agentArgs.push('--daemon-name');
    agentArgs.push(options.daemonName);
  }
  await execFilePromisified(agentPath, agentArgs, {
    env: agentEnv,
  });
};
