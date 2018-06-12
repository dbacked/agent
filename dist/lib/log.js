"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Winston = require("winston");
const config_1 = require("./config");
const logger = Winston.createLogger({
    level: config_1.LOG_LEVEL,
    format: Winston.format.json(),
    transports: [
        new Winston.transports.File({ filename: 'error.log', level: 'error' }),
        new Winston.transports.File({ filename: 'combined.log' }),
        new Winston.transports.Console(),
    ],
});
exports.default = logger;
//# sourceMappingURL=log.js.map