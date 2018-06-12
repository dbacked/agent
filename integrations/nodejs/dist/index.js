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
const agentFile_1 = require("./lib/agentFile");
const agentProcess_1 = require("./lib/agentProcess");
exports.initAgent = function init(options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield agentFile_1.checkAgentFile();
            yield agentProcess_1.startAgent(options);
        }
        catch (e) {
            console.error('Error while starting DBacked agent', e);
        }
    });
};
//# sourceMappingURL=index.js.map