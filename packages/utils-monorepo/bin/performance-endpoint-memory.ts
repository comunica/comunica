#!/usr/bin/env node

// eslint-disable-next-line import/no-nodejs-modules
import cluster from 'node:cluster';

// eslint-disable-next-line import/no-nodejs-modules
import { resolve } from 'node:path';

import { CliArgsHandlerMemory } from '../lib/performanceEndpointMemory';

/**
 * The parts of HttpServiceSparqlEndpoint of @comunica/actor-init-query that are used here.
 */
interface IHttpServiceSparqlEndpoint {
  runArgsInProcess: (
    argv: string[],
    stdout: NodeJS.WritableStream,
    stderr: NodeJS.WritableStream,
    moduleRootPath: string,
    env: NodeJS.ProcessEnv,
    defaultConfigPath: string,
    exit: (code: number) => void,
    cliArgsHandlers: CliArgsHandlerMemory[],
  ) => Promise<void>;
}

// Starts the SPARQL endpoint of an engine over an in-memory copy of local RDF files, which can be updated.
// The engine is loaded from its directory, just like performance-ingestion does, so that it is not a dependency.
const [ engineDir, ...args ] = process.argv.slice(2);
if (!engineDir) {
  process.stderr.write('Usage: performance-endpoint-memory <engine dir> <file...> [SPARQL endpoint options]\n');
  process.exit(1);
}
const engineRoot = resolve(engineDir);
// Resolved from the engine, which depends on it, so that the endpoint of the given engine is started
const actorInitQuery = '@comunica/actor-init-query';
// eslint-disable-next-line ts/no-var-requires, ts/no-require-imports
const { HttpServiceSparqlEndpoint }: { HttpServiceSparqlEndpoint: IHttpServiceSparqlEndpoint } = require(
  require.resolve(actorInitQuery, { paths: [ engineRoot ]}),
);
const exit = (code: number): never => process.exit(code);
HttpServiceSparqlEndpoint.runArgsInProcess(
  args,
  process.stdout,
  process.stderr,
  `${engineRoot}/`,
  process.env,
  `${engineRoot}/config/config-default.json`,
  exit,
  [ new CliArgsHandlerMemory(cluster, process.stderr, exit) ],
).catch((error: Error) => process.stderr.write(`${error.message}\n`));
