import * as program from 'commander';
import assertExit from './lib/assertExit';
import { getProject, registerApiKey, createBackup } from './lib/dbackedApi';
import { delay } from './lib/delay';
import { getOrGenerateAgentId } from './lib/agentId';

program.version('0.0.1')
  .option('--apikey <apikey>', 'DBacked API key (can also be provided with the DBACKED_APIKEY env variable)')
  .option('--public-key <publicKey>', 'Public key linked to the project (env variable: DBACKED_PUBLIC_KEY)')
  .option('--db-type <dbType>', 'Database type (pg or mysql)', /^(pg|mysql)$/)
  .option('--db-host <dbHost>', 'Database host (env variable: DBACKED_DB_HOST)')
  .option('--db-username <dbUsername>', 'Database username (env variable: DBACKED_DB_USERNAME)')
  .option('--db-password <dbPassword>', 'Database password (env variable: DBACKED_DB_PASSWORD)')
  .option('--db-name <dbName>', 'Database name (env variable: DBACKED_DB_NAME)')
  .parse(process.argv);

assertExit(program.apikey, '--apikey is required');
// assertExit(program.publicKey, '--public-key is required');
// assertExit(program.dbType, '--db-type is required');
// assertExit(program.dbHost, '--db-host is required');
// assertExit(program.dbUsername, '--db-username is required');
// assertExit(program.dbPassword, '--db-password is required');
// assertExit(program.dbName, '--db-name is required');

async function main() {
  const agentId = await getOrGenerateAgentId();
  registerApiKey(program.apikey);
  while (true) {
    const project = await getProject();
    try {
      const newBackup = await createBackup({ agentId });
      console.log(newBackup);
    } catch (e) {
      if (e.response && e.response.data && e.response.data.status === 409) {
        console.error('No backup needed, waiting 5 minutes');
      } else {
        console.error('Unknown error while creating backup, waiting 5 minutes', e.code || e.response);
      }
    }
    await delay(5 * 60 * 1000);
  }
}

main();
