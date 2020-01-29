"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cronParser = __importStar(require("cron-parser"));
const v4_1 = __importDefault(require("uuid/v4"));
const lodash_1 = require("lodash");
const pg_1 = require("pg");
const luxon_1 = require("luxon");
const mongodb_1 = require("mongodb");
const mysql_1 = require("mysql");
const delay_1 = require("./delay");
const util_1 = require("util");
const databaseTypes = {
    pg: {
        createClient: (connectionInfo) => {
            const client = new pg_1.Client({
                host: connectionInfo.dbHost,
                port: connectionInfo.dbPort ? Number(connectionInfo.dbPort) : undefined,
                user: connectionInfo.dbUsername,
                database: connectionInfo.dbName,
                password: connectionInfo.dbPassword,
            });
            client.connect();
            return client;
        },
        getDatabaseBackupableInfo: async (connectionInfo) => {
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
        initDatabase: async (connectionInfo) => {
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
      `, [v4_1.default()]);
        },
        getDatabaseBackupStatus: async (connectionInfo) => {
            const client = databaseTypes.pg.createClient(connectionInfo);
            const info = await client.query(`
        SELECT * from dbacked;
      `);
            return lodash_1.fromPairs(info.rows.map(({ k, v }) => [k, v]));
        },
        saveBackupStatus: async (status, connectionInfo) => {
            const client = databaseTypes.pg.createClient(connectionInfo);
            await Promise.all(lodash_1.map(status, (val, key) => client.query(`
        INSERT INTO dbacked (k, v)
        VALUES ($1, $2)
        ON CONFLICT (k) DO UPDATE SET v = $2;
      `, [key, val])));
        },
    },
    mysql: {
        createClientQuery: (connectionInfo) => {
            const client = mysql_1.createConnection({
                host: connectionInfo.dbHost,
                port: connectionInfo.dbPort ? Number(connectionInfo.dbPort) : undefined,
                user: connectionInfo.dbUsername,
                password: connectionInfo.dbPassword,
                database: connectionInfo.dbName,
            });
            client.connect();
            return util_1.promisify(client.query.bind(client));
        },
        getDatabaseBackupableInfo: async (connectionInfo) => {
            const clientQuery = databaseTypes.mysql.createClientQuery(connectionInfo);
            return clientQuery(`
        SELECT table_name as name, table_rows as "lineCount"
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = '${connectionInfo.dbName}';
      `);
        },
        initDatabase: async (connectionInfo) => {
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
      `, [v4_1.default()]);
        },
        getDatabaseBackupStatus: async (connectionInfo) => {
            const clientQuery = databaseTypes.mysql.createClientQuery(connectionInfo);
            const info = await clientQuery(`
        SELECT * from dbacked;
      `);
            return lodash_1.fromPairs(info.map(({ k, v }) => [k, v]));
        },
        saveBackupStatus: async (status, connectionInfo) => {
            const clientQuery = databaseTypes.mysql.createClientQuery(connectionInfo);
            await Promise.all(lodash_1.map(status, (val, key) => clientQuery(`
        INSERT INTO dbacked (k, v)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE v = ?;
      `, [key, val, val])));
        },
    },
    mongodb: {
        createClient: async (connectionInfo) => {
            const client = await mongodb_1.MongoClient.connect(connectionInfo.dbConnectionString, { useNewUrlParser: true });
            return client.db();
        },
        getDatabaseBackupableInfo: async (connectionInfo) => {
            const db = await databaseTypes.mongodb.createClient(connectionInfo);
            const collections = await db.listCollections().toArray();
            return Promise.all(collections.map(async ({ name }) => {
                const col = db.collection(name);
                const lineCount = await col.estimatedDocumentCount();
                return { name, lineCount };
            }));
        },
        initDatabase: async (connectionInfo) => {
            const db = await databaseTypes.mongodb.createClient(connectionInfo);
            const collection = await db.createCollection('dbacked');
            await collection.updateOne({
                k: 'dbId',
            }, {
                $setOnInsert: {
                    v: v4_1.default(),
                },
            }, { upsert: true });
        },
        getDatabaseBackupStatus: async (connectionInfo) => {
            const db = await databaseTypes.mongodb.createClient(connectionInfo);
            const info = await db
                .collection('dbacked')
                .find()
                .toArray();
            return lodash_1.fromPairs(info.map(({ k, v }) => [k, v]));
        },
        saveBackupStatus: async (status, connectionInfo) => {
            const db = await databaseTypes.mongodb.createClient(connectionInfo);
            await Promise.all(lodash_1.map(status, (val, key) => db.collection('dbacked').update({
                k: key,
            }, {
                $set: {
                    v: val,
                },
            }, { upsert: true })));
        },
    },
};
exports.getDatabaseBackupableInfo = async (dbType, connectionInfo) => databaseTypes[dbType].getDatabaseBackupableInfo(connectionInfo);
exports.initDatabase = async (dbType, connectionInfo) => databaseTypes[dbType].initDatabase(connectionInfo);
exports.getDatabaseBackupStatus = async (dbType, connectionInfo) => databaseTypes[dbType].getDatabaseBackupStatus(connectionInfo);
const isBackupNeeded = async (config) => {
    const backupStatus = await exports.getDatabaseBackupStatus(config.dbType, config);
    const lastBackupDate = luxon_1.DateTime.fromMillis(backupStatus.lastBackupDate || 0).toUTC();
    const cronExpression = cronParser.parseExpression(config.cron, { utc: true });
    const idealPreviousCronDate = luxon_1.DateTime.fromJSDate(cronExpression.prev().toDate()).toUTC();
    return lastBackupDate.diff(idealPreviousCronDate).as('minutes') < 0;
};
exports.saveBackupStatus = async (dbType, status, connectionInfo) => databaseTypes[dbType].saveBackupStatus(status, connectionInfo);
exports.waitForNextBackupNeededFromDatabase = async (config) => {
    while (true) {
        if (await isBackupNeeded(config)) {
            return true;
        }
        // If no backup needed, wait 4 minutes and try again
        await delay_1.delay(1000 * 60 * 5);
    }
};
//# sourceMappingURL=dbStats.js.map