import { resolve } from 'path';
import { createHash } from 'crypto';
import { writeFile, createReadStream, PathLike } from 'fs';
import { promisify } from 'util';
import { exec } from 'pkg';

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

const rootDir = resolve(__dirname, '../../');

async function main() {
  console.log('Compiling');
  await exec([
    resolve(rootDir, 'package.json'), '--output', resolve(rootDir, 'dbacked_agent'),
    '--target', 'host',
  ]);
  console.log('Compiled');
  const md5 = await getFileMd5(resolve(rootDir, 'dbacked_agent'));
  await writeFilePromisified(resolve(rootDir, 'dbacked_agent_md5'), md5);
  console.log('MD5 saved');
}

main();
