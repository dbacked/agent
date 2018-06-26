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

export const AGENT_URL = 'https://dl.dbacked.com/dbacked';
export const AGENT_MD5_URL = 'https://dl.dbacked.com/dbacked_md5';
