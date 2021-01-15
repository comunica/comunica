#!/usr/bin/env node

import { runArgs } from '../lib/ArgsRunner';

const argv = process.argv.slice(2);
if (argv.length === 0 || /^--?h(elp)?$/u.test(argv[0])) {
  process.stdout.write('usage: runner-cli config.json [args...]`n');
  process.exit(1);
}

const configResourceUrl = argv.shift()!;
runArgs(configResourceUrl, argv, process.stdin, process.stdout, process.stderr, process.env);
