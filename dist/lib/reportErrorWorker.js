const Axios = require('axios');
const API_ROOT = process.env.DBACKED_LOCAL_API ? 'http://localhost:5000' : 'https://api.dbacked.com';
function init() {
    return function sendError(message) {
        const { backup, error, agentId, apikey, } = JSON.parse(message);
        const api = Axios.create({
            baseURL: API_ROOT,
            headers: {
                Authorization: `ApiKey ${apikey}`,
            },
        });
        return api.post(`projects/${backup.projectId}/backups/${backup.id}/status`, {
            status: 'ERROR',
            error,
            agentId,
        }).then(() => 'ok');
    };
}
module.exports = init;
//# sourceMappingURL=reportErrorWorker.js.map