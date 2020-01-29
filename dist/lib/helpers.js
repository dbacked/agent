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
const Table = __importStar(require("cli-table"));
const log_1 = __importDefault(require("./log"));
const url_1 = require("url");
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals || 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / (k ** i)).toFixed(dm))} ${sizes[i]}`;
}
exports.formatBytes = formatBytes;
exports.assertExit = (test, message) => {
    if (!test) {
        log_1.default.error(message);
        process.exit(1);
    }
};
exports.formatDatabaseBackupableInfo = (databaseBackupableInfo) => {
    const table = new Table({
        head: ['Table name', 'Lines count'],
    });
    databaseBackupableInfo.forEach(({ name, lineCount }) => {
        table.push([name, lineCount]);
    });
    return table.toString();
};
exports.getDbNaming = (config) => {
    if (config.dbAlias) {
        return config.dbAlias;
    }
    if (config.dbConnectionString) {
        return (new url_1.URL(config.dbConnectionString)).pathname.slice(1);
    }
    return config.dbName;
};
//# sourceMappingURL=helpers.js.map