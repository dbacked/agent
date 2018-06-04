"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const program = require("commander");
program.version('0.0.1')
    .option('--type', 'Database type (pg or mysql)', /^(pg|mysql)$/)
    .parse(process.argv);
console.log('coucou');
//# sourceMappingURL=index.js.map