#!/usr/bin/env node
import {HttpServiceSparqlEndpoint} from "../lib/HttpServiceSparqlEndpoint";

const defaultConfigPath = __dirname + '/../config/config-default.json';
const configResourceURL = process.env.COMUNICA_CONFIG ? process.env.COMUNICA_CONFIG : defaultConfigPath;

HttpServiceSparqlEndpoint.runArgsInProcess(process.argv.slice(2), process.stdout, process.stderr,
  __dirname + '/../', configResourceURL, (code) => process.exit(code));
