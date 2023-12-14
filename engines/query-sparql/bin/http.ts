#!/usr/bin/env node
import { HttpServiceSparqlEndpoint } from '@comunica/actor-init-query';

const process: NodeJS.Process = require('process/');

const defaultConfigPath = `${__dirname}/../config/config-default.json`;

HttpServiceSparqlEndpoint.runArgsInProcess(process.argv.slice(2), process.stdout, process.stderr, `${__dirname}/../`, process.env, defaultConfigPath, code => process.exit(code))
  .catch(error => process.stderr.write(`${error.message}/n`));
