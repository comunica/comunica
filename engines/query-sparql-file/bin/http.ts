#!/usr/bin/env node
import { HttpServiceSparqlEndpoint } from '@comunica/actor-init-query';

const process: NodeJS.Process = require('process/');

// eslint-disable-next-line node/no-path-concat
const defaultConfigPath = `${__dirname}/../config/config-default.json`;

// eslint-disable-next-line node/no-path-concat
HttpServiceSparqlEndpoint.runArgsInProcess(process.argv.slice(2), process.stdout, process.stderr, `${__dirname}/../`, process.env, defaultConfigPath, code => process.exit(code))
  .catch(error => process.stderr.write(`${error.message}/n`));
