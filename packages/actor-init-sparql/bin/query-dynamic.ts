#!/usr/bin/env node

import {runArgs} from "@comunica/runner-cli";

// Hack to make dynamic invocation properly work in both dev environment and in production
function inDev() {
  return require('fs').existsSync(__dirname + '/../index.ts');
}

const argv = process.argv.slice(2);
runArgs(process.env.COMUNICA_CONFIG ? process.cwd() + '/' + process.env.COMUNICA_CONFIG
  : __dirname + '/../config/config-default.json', argv,
  process.stdin, process.stdout, process.stderr, process.env,
  null, { mainModulePath: inDev() ? __dirname + '/../' : __dirname + '/../../' });
