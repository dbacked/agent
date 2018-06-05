import { Readable } from 'stream';
import { inherits } from 'util';

function MultiStream(object, options?) {
  if (object instanceof Buffer || typeof object === 'string') {
    options = options || {};
    Readable.call(this, {
      highWaterMark: options.highWaterMark,
      encoding: options.encoding,
    });
  } else {
    Readable.call(this, { objectMode: true });
  }
  this._object = object;
}

inherits(MultiStream, Readable);

MultiStream.prototype._read = function _read() {
  this.push(this._object);
  this._object = null;
};

export const createReadStream = (object, options?) => {
  return new MultiStream(object, options);
};

