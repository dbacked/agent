"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("./log");
const child_process_1 = require("child_process");
const config_1 = require("./config");
exports.reportErrorSync = ({ backup, e, agentId, apikey, }) => {
    log_1.default.info('Sending error to DBacked API');
    const error = `${e.code || (e.response && e.response.data) || e.message}\n${e.stack}`;
    child_process_1.execFileSync('curl', [
        '-d', JSON.stringify({
            status: 'ERROR',
            error,
            agentId,
        }), '-H', 'Content-Type: application/json', '-X', 'POST',
        '-H', `Authorization: ApiKey ${apikey}`,
        `${config_1.API_ROOT}/projects/${backup.projectId}/backups/${backup.id}/status`,
    ], {
        stdio: [null, null, null],
    });
    log_1.default.info('Sent error to DBacked API');
};
//# sourceMappingURL=reportError.js.map