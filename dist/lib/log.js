"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Winston = require("winston");
const LOG_LEVEL = process.env.DBACKED_DEBUG ? 'debug' : 'info';
const logger = Winston.createLogger({
    level: LOG_LEVEL,
    format: Winston.format.json(),
    transports: [
        new Winston.transports.File({ filename: 'error.log', level: 'error' }),
        new Winston.transports.File({ filename: 'combined.log' }),
        new Winston.transports.Console(),
    ],
});
exports.default = logger;
//# sourceMappingURL=log.js.map