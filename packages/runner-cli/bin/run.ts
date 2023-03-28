#!/usr/bin/env node

import { runArgs } from '../lib/ArgsRunner';

const process: NodeJS.Process = require('process/');

const argv = process.argv.slice(2);
if (argv.length === 0 || /^--?h(elp)?$/u.test(argv[0])) {
  process.stdout.write('usage: runner-cli config.json [args...]`n');
  process.exit(1);
}

const configResourceUrl = argv.shift()!;
// eslint-disable-next-line max-len
runArgs(configResourceUrl, argv, process.stdin, process.stdout, process.stderr, (code?: number) => process.exit(code), process.env);
