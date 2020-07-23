#!/usr/bin/env node
import { HttpServiceSparqlEndpoint } from '@comunica/actor-init-sparql';

const defaultConfigPath = `${__dirname}/../config/config-default.json`;

HttpServiceSparqlEndpoint.runArgsInProcess(process.argv.slice(2), process.stdout, process.stderr, `${__dirname}/../`, process.env, defaultConfigPath, () => process.exit(1))
  .catch(error => process.stderr.write(`${error.message}/n`));
