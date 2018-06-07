import { compile } from 'nexe';
import { resolve } from 'path';

console.log('Compiling');
compile({
  input: resolve(__dirname, '../../dist/index.js'),
  build: true,
  targets: ['linux-x64'],
  python: '/usr/bin/python2',
  name: 'dbacked_agent',
}).then(() => {
  console.log('Done !');
});

