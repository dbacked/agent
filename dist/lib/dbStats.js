"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const mysql_1 = require("mysql");
const mongodb_1 = require("mongodb");
const util_1 = require("util");
const databaseTypes = {
    pg: {
        getDatabaseBackupableInfo: async (connectionInfo) => {
            const client = new pg_1.Client({
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
        getDatabaseBackupableInfo: async (connectionInfo) => {
            const client = mysql_1.createConnection({
                host: connectionInfo.dbHost,
                port: connectionInfo.dbPort ? Number(connectionInfo.dbPort) : undefined,
                user: connectionInfo.dbUsername,
                password: connectionInfo.dbPassword,
                database: connectionInfo.dbName,
            });
            client.connect();
            const res = await util_1.promisify(client.query.bind(client))(`
        SELECT table_name as name, table_rows as "lineCount"
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = '${connectionInfo.dbName}';
      `);
            return res;
        },
    },
    mongodb: {
        getDatabaseBackupableInfo: async (connectionInfo) => {
            const client = await mongodb_1.MongoClient.connect(connectionInfo.dbConnectionString, { useNewUrlParser: true });
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
exports.getDatabaseBackupableInfo = async (dbType, connectionInfo) => databaseTypes[dbType].getDatabaseBackupableInfo(connectionInfo);
//# sourceMappingURL=dbStats.js.map