#!/usr/bin/env node
import {HttpServiceSparqlEndpoint} from "@comunica/actor-init-sparql";
import minimist = require("minimist");
try {
  const defaultConfigPath = __dirname + '/../config/config-default.json';
  const configResourceURL = process.env.COMUNICA_CONFIG ? process.env.COMUNICA_CONFIG : defaultConfigPath;

  HttpServiceSparqlEndpoint.runArgsInProcess(minimist(process.argv.slice(2)), process.stdout, process.stderr,
      __dirname + '/../', __dirname + '/../config/config-default.json');
} catch (Error) {
  // tslint:disable:max-line-length
  process.stderr.write(`comunica-sparql-http exposes a Comunica engine as SPARQL endpoint 

context should be a JSON object or the path to such a JSON file.

Usage:
  comunica-sparql-http context.json [-p port] [-t timeout] [-l log-level] [-i] [--help]
  comunica-sparql-http "{ \\"sources\\": [{ \\"type\\": \\"hypermedia\\", \\"value\\" : \\"http://fragments.dbpedia.org/2015/en\\" }]}" [-p port] [-t timeout] [-l log-level] [-i] [--help]

Options:
  -p            The HTTP port to run on (default: 3000)
  -t            The query execution timeout in seconds (default: 60)
  -l            Sets the log level (e.g., debug, info, warn, ... defaults to warn)
  -i            A flag that enables cache invalidation before each query execution.
  --help        print this help message
`);
  process.exit(1);
}
