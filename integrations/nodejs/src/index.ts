import { checkAgentFile } from './lib/agentFile';
import { startAgent } from './lib/agentProcess';
import { DBackedAgentOption } from './lib/constants';

exports.initAgent = async function init(options: DBackedAgentOption) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('DBACKED: process.env.NODE_ENV is not equal to production, not starting agent');
    return;
  }
  try {
    await checkAgentFile();
    await startAgent(options);
  } catch (e) {
    console.error('Error while starting DBacked agent', e);
  }
};
