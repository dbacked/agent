import { compile } from 'nexe';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { writeFile, createReadStream, PathLike } from 'fs';
import { promisify } from 'util';

const writeFilePromisified = promisify(writeFile);

export const getFileMd5 = (filePath: PathLike) => {
  return new Promise((resolvePromise) => {
    const hash = createHash('md5');
    const stream = createReadStream(filePath);
    stream.pipe(hash);
    hash.on('readable', () => {
      resolvePromise((<Buffer>hash.read()).toString('hex'));
    });
  });
};

console.log('Compiling');
compile({
  input: resolve(__dirname, '../../dist/index.js'),
  build: true,
  targets: ['linux-x64'],
  python: '/usr/bin/python2',
  name: 'dbacked_agent',
}).then(async () => {
  console.log('Done !');
  const md5 = await getFileMd5(resolve(__dirname, '../../dbacked_agent'));
  await writeFilePromisified(resolve(__dirname, '../../dbacked_agent_md5'), md5);
});

