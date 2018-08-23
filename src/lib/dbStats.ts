import * as uuidv4 from 'uuid/v4';
import { fromPairs, map } from 'lodash';
import { Client } from 'pg';
import { createConnection } from 'mysql';
import { MongoClient } from 'mongodb';
import { promisify } from 'util';
import { DateTime } from 'luxon';
import * as cronParser from 'cron-parser';
import { Config } from './config';
import { delay } from './delay';

interface DB_CONNECTION_INFO {
  dbHost?: string;
  dbUsername?: string;
  dbPassword?: string;
  dbName?: string;
  dbPort?: string;
  dbConnectionString?: string;
}

const databaseTypes = {
  pg: {
    createClient: (connectionInfo: DB_CONNECTION_INFO) => {
      const client = new Client({
        host: connectionInfo.dbHost,
        port: connectionInfo.dbPort ? Number(connectionInfo.dbPort) : undefined,
        user: connectionInfo.dbUsername,
        database: connectionInfo.dbName,
        password: connectionInfo.dbPassword,
      });
      client.connect();
      return client;
    },
    getDatabaseBackupableInfo: async (connectionInfo: DB_CONNECTION_INFO) => {
      const client = databaseTypes.pg.createClient(connectionInfo);
      const info = await client.query(`SELECT
        relname as name, reltuples as "lineCount"
        FROM pg_class C
        LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace)
        WHERE
          nspname NOT IN ('pg_catalog', 'information_schema') AND
          relkind='r'
        ORDER BY reltuples DESC;
      `);
      return info.rows;
    },
    initDatabase: async (connectionInfo: DB_CONNECTION_INFO) => {
      // If the database is already initiated, this will do nothing
      const client = databaseTypes.pg.createClient(connectionInfo);
      await client.query(`
        CREATE TABLE IF NOT EXISTS dbacked (
          k text PRIMARY KEY,
          v text
        );
      `);
      await client.query(`
        INSERT INTO dbacked (k, v)
        VALUES ('dbId', $1)
        ON CONFLICT (k) DO NOTHING
      `, [uuidv4()]);
    },
    getDatabaseBackupStatus: async (connectionInfo: DB_CONNECTION_INFO) => {
      const client = databaseTypes.pg.createClient(connectionInfo);
      const info = await client.query(`
        SELECT * from dbacked;
      `);
      return fromPairs(info.rows.map(({ k, v }) => [k, v]));
    },
    saveBackupStatus: async (status, connectionInfo: DB_CONNECTION_INFO) => {
      const client = databaseTypes.pg.createClient(connectionInfo);
      await Promise.all(map(status, (val, key) => client.query(`
        INSERT INTO dbacked (k, v)
        VALUES ($1, $2)
        ON CONFLICT (k) DO UPDATE SET v = $2;
      `, [key, val])));
    },
  },
  mysql: {
    createClientQuery: (connectionInfo: DB_CONNECTION_INFO) => {
      const client = createConnection({
        host: connectionInfo.dbHost,
        port: connectionInfo.dbPort ? Number(connectionInfo.dbPort) : undefined,
        user: connectionInfo.dbUsername,
        password: connectionInfo.dbPassword,
        database: connectionInfo.dbName,
      });
      client.connect();
      return promisify(client.query.bind(client));
    },
    getDatabaseBackupableInfo: async (connectionInfo: DB_CONNECTION_INFO) => {
      const clientQuery = databaseTypes.mysql.createClientQuery(connectionInfo);
      return clientQuery(`
        SELECT table_name as name, table_rows as "lineCount"
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = '${connectionInfo.dbName}';
      `);
    },
    initDatabase: async (connectionInfo: DB_CONNECTION_INFO) => {
      const clientQuery = databaseTypes.mysql.createClientQuery(connectionInfo);
      await clientQuery(`
        CREATE TABLE IF NOT EXISTS dbacked (
          k VARCHAR(128) UNIQUE NOT NULL,
          v VARCHAR(255)
        );
      `);
      await clientQuery(`
        INSERT IGNORE INTO dbacked (k, v)
        VALUES ('dbId', ?);
      `, [uuidv4()]);
    },
    getDatabaseBackupStatus: async (connectionInfo: DB_CONNECTION_INFO) => {
      const clientQuery = databaseTypes.mysql.createClientQuery(connectionInfo);
      const info = await clientQuery(`
        SELECT * from dbacked;
      `);
      return fromPairs(info.map(({ k, v }) => [k, v]));
    },
    saveBackupStatus: async (status, connectionInfo: DB_CONNECTION_INFO) => {
      const clientQuery = databaseTypes.mysql.createClientQuery(connectionInfo);
      await Promise.all(map(status, (val, key) => clientQuery(`
        INSERT INTO dbacked (k, v)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE v = ?;
      `, [key, val, val])));
    },
  },
  mongodb: {
    getDatabaseBackupableInfo: async (connectionInfo: DB_CONNECTION_INFO) => {
      const client = await MongoClient.connect(
        connectionInfo.dbConnectionString,
        { useNewUrlParser: true },
      );
      const db = client.db(connectionInfo.dbName);
      const collections = await db.listCollections().toArray();
      return Promise.all(collections.map(async ({ name }) => {
        const col = db.collection(name);
        const lineCount = await col.estimatedDocumentCount();
        return { name, lineCount };
      }));
    },
    // TODO: initDatabase for mongodb
    // TODO: getDatabaseBackupStatus for mongodb
  },
};

export const getDatabaseBackupableInfo = async (dbType, connectionInfo: DB_CONNECTION_INFO) =>
  databaseTypes[dbType].getDatabaseBackupableInfo(connectionInfo);

export const initDatabase = async (dbType, connectionInfo: DB_CONNECTION_INFO) =>
  databaseTypes[dbType].initDatabase(connectionInfo);

export const getDatabaseBackupStatus = async (dbType, connectionInfo: DB_CONNECTION_INFO) =>
  databaseTypes[dbType].getDatabaseBackupStatus(connectionInfo);

const isBackupNeeded = async (config: Config) => {
  const backupStatus = await getDatabaseBackupStatus(config.dbType, config);

  const lastBackupDate = DateTime.fromMillis(backupStatus.lastBackupDate || 0).toUTC();
  const cronExpression = cronParser.parseExpression(config.cron, { utc: true });

  const idealPreviousCronDate = DateTime.fromJSDate(cronExpression.prev().toDate()).toUTC();
  return lastBackupDate.diff(idealPreviousCronDate).as('minutes') < 0;
};

export const saveBackupStatus = async (dbType, status, connectionInfo: DB_CONNECTION_INFO) =>
  databaseTypes[dbType].saveBackupStatus(status, connectionInfo);

export const waitForNextBackupNeededFromDatabase = async (config: Config) => {
  while (true) {
    if (await isBackupNeeded(config)) {
      return true;
    }
    // If no backup needed, wait 4 minutes and try again
    await delay(1000 * 60 * 5);
  }
};
