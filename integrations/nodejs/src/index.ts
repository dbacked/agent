import { checkAgentFile } from './lib/agentFile';
import { startAgent } from './lib/agentProcess';
import { DBackedAgentOption } from './lib/constants';

exports.initAgent = async function init(options: DBackedAgentOption) {
  await checkAgentFile();
  await startAgent(options);
};

exports.initAgent();
