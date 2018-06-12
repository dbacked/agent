"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("https");
exports.getFileHttps = (fileUrl) => {
    return new Promise((resolve, reject) => {
        let fileData = '';
        https_1.get(fileUrl, (res) => {
            res.on('data', (data) => { fileData += data; });
            res.on('end', () => resolve(fileData));
        }).on('error', reject);
    });
};
//# sourceMappingURL=request.js.map