import { Client } from 'pg';
import { createConnection } from 'mysql';
import { MongoClient } from 'mongodb';
import { promisify } from 'util';

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
    getDatabaseBackupableInfo: async (connectionInfo: DB_CONNECTION_INFO) => {
      const client = new Client({
        host: connectionInfo.dbHost,
        port: connectionInfo.dbPort ? Number(connectionInfo.dbPort) : undefined,
        user: connectionInfo.dbUsername,
        database: connectionInfo.dbName,
        password: connectionInfo.dbPassword,
      });
      client.connect();
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
  },
  mysql: {
    getDatabaseBackupableInfo: async (connectionInfo: DB_CONNECTION_INFO) => {
      const client = createConnection({
        host: connectionInfo.dbHost,
        port: connectionInfo.dbPort ? Number(connectionInfo.dbPort) : undefined,
        user: connectionInfo.dbUsername,
        password: connectionInfo.dbPassword,
        database: connectionInfo.dbName,
      });
      client.connect();
      const res = await promisify(client.query.bind(client))(`
        SELECT table_name as name, table_rows as "lineCount"
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = '${connectionInfo.dbName}';
      `);
      return res;
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
  },
};

export const getDatabaseBackupableInfo = async (dbType, connectionInfo: DB_CONNECTION_INFO) =>
  databaseTypes[dbType].getDatabaseBackupableInfo(connectionInfo);
