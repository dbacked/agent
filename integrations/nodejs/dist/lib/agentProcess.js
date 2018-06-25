"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const child_process_1 = require("child_process");
const agentFile_1 = require("./agentFile");
const execFilePromisified = util_1.promisify(child_process_1.execFile);
exports.startAgent = (options) => __awaiter(this, void 0, void 0, function* () {
    const agentDirectory = agentFile_1.getAgentDirectory();
    const agentPath = agentFile_1.getAgentPath();
    const agentEnv = Object.assign({ DBACKED_APIKEY: options.apikey, DBACKED_DB_TYPE: options.dbType, DBACKED_DB_HOST: options.db.host, DBACKED_DB_USERNAME: options.db.user, DBACKED_DB_PASSWORD: options.db.password, DBACKED_DB_NAME: options.db.database }, process.env);
    if (options.publicKey) {
        agentEnv.DBACKED_PUBLIC_KEY = options.publicKey;
    }
    const agentArgs = ['start-agent', '--daemon', '--config-directory', agentDirectory];
    if (options.daemonName) {
        agentArgs.push('--daemon-name');
        agentArgs.push(options.daemonName);
    }
    yield execFilePromisified(agentPath, agentArgs, {
        env: agentEnv,
    });
});
//# sourceMappingURL=agentProcess.js.map