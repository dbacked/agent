"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const util_1 = require("util");
function MultiStream(object, options) {
    if (object instanceof Buffer || typeof object === 'string') {
        options = options || {};
        stream_1.Readable.call(this, {
            highWaterMark: options.highWaterMark,
            encoding: options.encoding,
        });
    }
    else {
        stream_1.Readable.call(this, { objectMode: true });
    }
    this._object = object;
}
util_1.inherits(MultiStream, stream_1.Readable);
MultiStream.prototype._read = function _read() {
    this.push(this._object);
    this._object = null;
};
exports.createReadStream = (object, options) => {
    return new MultiStream(object, options);
};
//# sourceMappingURL=streamHelpers.js.map