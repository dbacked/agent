"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Winston = __importStar(require("winston"));
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