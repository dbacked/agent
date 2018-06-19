import logger from './log';
import { execFileSync } from 'child_process';
import { API_ROOT } from './config';

export const reportErrorSync = ({
  backup, e, agentId, apikey,
}) => {
  logger.info('Sending error to DBacked API');
  const error = `${e.code || (e.response && e.response.data) || e.message}\n${e.stack}`;
  execFileSync('curl', [
    '-d', JSON.stringify({
      status: 'ERROR',
      error,
      agentId,
    }), '-H', 'Content-Type: application/json', '-X', 'POST',
    '-H', `Authorization: ApiKey ${apikey}`,
    `${API_ROOT}/projects/${backup.projectId}/backups/${backup.id}/status`,
  ], {
    stdio: [null, null, null],
  });
  logger.info('Sent error to DBacked API');
};
