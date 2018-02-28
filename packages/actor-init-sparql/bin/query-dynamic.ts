#!/usr/bin/env node

import {runArgs} from "@comunica/runner-cli";

const argv = process.argv.slice(2);
runArgs(process.env.COMUNICA_CONFIG ? process.cwd() + '/' + process.env.COMUNICA_CONFIG
  : __dirname + '/../config/config-default.json', argv,
  process.stdin, process.stdout, process.stderr, process.env,
  null, { mainModulePath: __dirname + '/../' });
