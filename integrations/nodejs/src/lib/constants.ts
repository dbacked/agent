enum DBType {
  pq = 'pq',
  mysql = 'mysql',
}

export interface DBackedAgentOption {
  apikey: string;
  publicKey?: string;
  dbType: DBType,
  daemonName?: string;
  db: {
    host: string;
    user: string;
    password?: string;
    database: string;
  }
}

export const AGENT_URL = 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/dbacked_agent';
export const AGENT_MD5_URL = 'https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/dbacked_agent_md5';
