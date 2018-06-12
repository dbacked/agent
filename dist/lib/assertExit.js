"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertExit = (test, message) => {
    if (!test) {
        console.error(message);
        process.exit(1);
    }
};
exports.default = assertExit;
//# sourceMappingURL=assertExit.js.map