#!/usr/bin/env node

import {runArgs} from "../lib/ArgsRunner";

const argv = process.argv.slice(2);
if (argv.length < 1 || /^--?h(elp)?$/.test(argv[0])) {
  console.log('usage: runner-cli config.json [args...]');
  process.exit(1);
}

const configResourceUrl = argv.shift();
runArgs(configResourceUrl, argv, process.stdin, process.stdout, process.stderr, process.env);
