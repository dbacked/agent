export const API_ROOT = 'https://api.dbacked.com';
export const LOG_LEVEL = 'debug';

export enum DB_TYPE {
  pg = 'pg',
  mysql = 'mysql',
}

export interface Config {
  apikey: string;
  publicKey: string;
  dbType: DB_TYPE;
  dbHost: string;
  dbUsername: string;
  dbPassword: string;
  dbName: string;
  configDirectory: string;
}
