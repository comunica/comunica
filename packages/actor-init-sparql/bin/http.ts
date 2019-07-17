#!/usr/bin/env node
import {HttpServiceSparqlEndpoint} from "../lib/HttpServiceSparqlEndpoint";

const defaultConfigPath = __dirname + '/../config/config-default.json';

HttpServiceSparqlEndpoint.runArgsInProcess(process.argv.slice(2), process.stdout, process.stderr,
  __dirname + '/../', process.env, defaultConfigPath, (code) => process.exit(code));
