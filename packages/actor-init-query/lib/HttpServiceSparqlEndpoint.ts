/* eslint-disable import/no-nodejs-modules */
import * as cluster from 'cluster';
import type { EventEmitter } from 'events';
import * as http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import * as querystring from 'querystring';
import type { Writable } from 'stream';
import * as url from 'url';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { ICliArgsHandler, QueryQuads, QueryType } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import yargs from 'yargs';
// eslint-disable-next-line import/no-useless-path-segments
import { QueryEngineBase, QueryEngineFactoryBase } from '..';
// eslint-disable-next-line import/no-useless-path-segments
import type { IDynamicQueryEngineOptions } from '..';
import { CliArgsHandlerBase } from './cli/CliArgsHandlerBase';
import { CliArgsHandlerHttp } from './cli/CliArgsHandlerHttp';

const quad = require('rdf-quad');

/**
 * An HTTP service that exposes a Comunica engine as a SPARQL endpoint.
 */
export class HttpServiceSparqlEndpoint {
  public static readonly MIME_PLAIN = 'text/plain';
  public static readonly MIME_JSON = 'application/json';

  public readonly engine: Promise<QueryEngineBase>;

  public readonly context: any;
  public readonly timeout: number;
  public readonly port: number;
  public readonly workers: number;

  public readonly invalidateCacheBeforeQuery: boolean;
  public readonly freshWorkerPerQuery: boolean;
  public readonly contextOverride: boolean;

  public lastQueryId = 0;

  public constructor(args: IHttpServiceSparqlEndpointArgs) {
    this.context = args.context || {};
    this.timeout = args.timeout ?? 60_000;
    this.port = args.port ?? 3_000;
    this.workers = args.workers ?? 1;
    this.invalidateCacheBeforeQuery = Boolean(args.invalidateCacheBeforeQuery);
    this.freshWorkerPerQuery = Boolean(args.freshWorkerPerQuery);
    this.contextOverride = Boolean(args.contextOverride);

    this.engine = new QueryEngineFactoryBase(
      args.moduleRootPath,
      args.defaultConfigPath,
      actorInitQuery => new QueryEngineBase(actorInitQuery),
    ).create(args);
  }

  /**
   * Starts the server
   * @param {string[]} argv The commandline arguments that the script was called with
   * @param {module:stream.internal.Writable} stdout The output stream to log to.
   * @param {module:stream.internal.Writable} stderr The error stream to log errors to.
   * @param {string} moduleRootPath The path to the invoking module.
   * @param {NodeJS.ProcessEnv} env The process env to get constants from.
   * @param {string} defaultConfigPath The path to get the config from if none is defined in the environment.
   * @param {(code: number) => void} exit The callback to invoke to stop the script.
   * @param {ICliArgsHandler[]} cliArgsHandlers Enables manipulation of the CLI arguments and their processing.
   * @return {Promise<void>} A promise that resolves when the server has been started.
   */
  public static async runArgsInProcess<Q>(
    argv: string[],
    stdout: Writable,
    stderr: Writable,
    moduleRootPath: string,
    env: NodeJS.ProcessEnv,
    defaultConfigPath: string,
    exit: (code: number) => void,
    cliArgsHandlers: ICliArgsHandler[] = [],
  ): Promise<void> {
    const options = await HttpServiceSparqlEndpoint
      .generateConstructorArguments(argv, moduleRootPath, env, defaultConfigPath, stderr, exit, cliArgsHandlers);

    return new Promise<void>(resolve => {
      new HttpServiceSparqlEndpoint(options || {}).run(stdout, stderr)
        .then(resolve)
        .catch(error => {
          stderr.write(error);
          exit(1);
          resolve();
        });
    });
  }

  /**
   * Takes parsed commandline arguments and turns them into an object used in the HttpServiceSparqlEndpoint constructor
   * @param {args: minimist.ParsedArgs} args The commandline arguments that the script was called with
   * @param {string} moduleRootPath The path to the invoking module.
   * @param {NodeJS.ProcessEnv} env The process env to get constants from.
   * @param {string} defaultConfigPath The path to get the config from if none is defined in the environment.
   * @param {ICliArgsHandler[]} cliArgsHandlers Enables manipulation of the CLI arguments and their processing.
   */
  public static async generateConstructorArguments(argv: string[], moduleRootPath: string,
    env: NodeJS.ProcessEnv, defaultConfigPath: string, stderr: Writable,
    exit: (code: number) => void, cliArgsHandlers: ICliArgsHandler[]): Promise<IHttpServiceSparqlEndpointArgs> {
    // Populate yargs arguments object
    cliArgsHandlers = [
      new CliArgsHandlerBase(),
      new CliArgsHandlerHttp(),
      ...cliArgsHandlers,
    ];
    let argumentsBuilder = yargs({});
    for (const cliArgsHandler of cliArgsHandlers) {
      argumentsBuilder = cliArgsHandler.populateYargs(argumentsBuilder);
    }

    // Extract raw argument values from parsed yargs object, so that we can handle each of them hereafter
    let args: Record<string, any>;
    try {
      args = await argumentsBuilder.parse(argv);
    } catch (error: unknown) {
      stderr.write(`${await argumentsBuilder.getHelp()}\n\n${(<Error> error).message}\n`);
      return exit(1)!;
    }

    // Invoke args handlers to process any remaining args
    const context: Record<string, any> = {};
    try {
      for (const cliArgsHandler of cliArgsHandlers) {
        await cliArgsHandler.handleArgs(args, context);
      }
    } catch (error: unknown) {
      stderr.write(`${(<Error>error).message}/n`);
      exit(1);
    }

    const invalidateCacheBeforeQuery: boolean = args.invalidateCache;
    const freshWorkerPerQuery: boolean = args.freshWorker;
    const contextOverride: boolean = args.contextOverride;
    const port = args.port;
    const timeout = args.timeout * 1_000;
    const workers = args.workers;
    context[KeysQueryOperation.readOnly.name] = !args.u;

    const configPath = env.COMUNICA_CONFIG ? env.COMUNICA_CONFIG : defaultConfigPath;

    return {
      defaultConfigPath,
      configPath,
      context,
      invalidateCacheBeforeQuery,
      freshWorkerPerQuery,
      contextOverride,
      moduleRootPath,
      mainModulePath: moduleRootPath,
      port,
      timeout,
      workers,
    };
  }

  /**
   * Start the HTTP service.
   * @param {module:stream.internal.Writable} stdout The output stream to log to.
   * @param {module:stream.internal.Writable} stderr The error stream to log errors to.
   */
  public run(stdout: Writable, stderr: Writable): Promise<void> {
    if (cluster.isMaster) {
      return this.runMaster(stdout, stderr);
    }
    return this.runWorker(stdout, stderr);
  }

  /**
   * Start the HTTP service as master.
   * @param {module:stream.internal.Writable} stdout The output stream to log to.
   * @param {module:stream.internal.Writable} stderr The error stream to log errors to.
   */
  public async runMaster(stdout: Writable, stderr: Writable): Promise<void> {
    stderr.write(`Server running on http://localhost:${this.port}/sparql\n`);

    // Create workers
    for (let i = 0; i < this.workers; i++) {
      cluster.fork();
    }

    // Attach listeners to each new worker
    cluster.on('listening', worker => {
      // Respawn crashed workers
      worker.once('exit', (code, signal) => {
        if (!worker.exitedAfterDisconnect) {
          if (code === 9 || signal === 'SIGKILL') {
            stderr.write(`Worker ${worker.process.pid} forcefully killed with ${code || signal}. Killing main process as well.\n`);
            cluster.disconnect();
          } else {
            stderr.write(`Worker ${worker.process.pid} died with ${code || signal}. Starting new worker.\n`);
            cluster.fork();
          }
        }
      });

      // Handle worker timeouts
      const workerTimeouts: Record<number, NodeJS.Timeout> = {};
      worker.on('message', ({ type, queryId }) => {
        if (type === 'start') {
          stderr.write(`Worker ${worker.process.pid} got assigned a new query (${queryId}).\n`);
          workerTimeouts[queryId] = setTimeout(() => {
            try {
              if (worker.isConnected()) {
                stderr.write(`Worker ${worker.process.pid} timed out for query ${queryId}.\n`);
                worker.send('shutdown');
              }
            } catch (error: unknown) {
              stderr.write(`Unable to timeout worker ${worker.process.pid}: ${(<Error> error).message}.\n`);
            }
            delete workerTimeouts[queryId];
          }, this.timeout);
        } else if (type === 'end' && workerTimeouts[queryId]) {
          stderr.write(`Worker ${worker.process.pid} has completed query ${queryId}.\n`);
          clearTimeout(workerTimeouts[queryId]);
          delete workerTimeouts[queryId];
        }
      });
    });

    // Disconnect from cluster on SIGINT, so that the process can cleanly terminate
    process.once('SIGINT', () => {
      cluster.disconnect();
    });
  }

  /**
   * Start the HTTP service as worker.
   * @param {module:stream.internal.Writable} stdout The output stream to log to.
   * @param {module:stream.internal.Writable} stderr The error stream to log errors to.
   */
  public async runWorker(stdout: Writable, stderr: Writable): Promise<void> {
    const engine: QueryEngineBase = await this.engine;

    // Determine the allowed media types for requests
    const mediaTypes: Record<string, number> = await engine.getResultMediaTypes();
    const variants: { type: string; quality: number }[] = [];
    for (const type of Object.keys(mediaTypes)) {
      variants.push({ type, quality: mediaTypes[type] });
    }

    // Start the server
    const server = http.createServer(this.handleRequest.bind(this, engine, variants, stdout, stderr));
    server.listen(this.port);
    stderr.write(`Server worker (${process.pid}) running on http://localhost:${this.port}/sparql\n`);

    // Keep track of all open connections
    const openConnections: Set<ServerResponse> = new Set();
    server.on('request', (request: IncomingMessage, response: ServerResponse) => {
      openConnections.add(response);
      response.on('close', () => {
        openConnections.delete(response);
      });
    });

    // Subscribe to shutdown messages
    process.on('message', async(message: string): Promise<void> => {
      if (message === 'shutdown') {
        stderr.write(`Shutting down worker ${process.pid} with ${openConnections.size} open connections.\n`);

        // Stop new connections from being accepted
        server.close();

        // Close all open connections
        for (const connection of openConnections) {
          await new Promise<void>(resolve => connection.end('!TIMEDOUT!', resolve));
        }

        // Kill the worker once the connections have been closed
        process.exit(15);
      }
    });

    // Catch global errors, and cleanly close open connections
    process.on('uncaughtException', async error => {
      stderr.write(`Terminating worker ${process.pid} with ${openConnections.size} open connections due to uncaught exception.\n`);
      stderr.write(error.stack);

      // Stop new connections from being accepted
      server.close();

      // Close all open connections
      for (const connection of openConnections) {
        await new Promise<void>(resolve => connection.end('!ERROR!', resolve));
      }

      // Kill the worker once the connections have been closed
      process.exit(15);
    });
  }

  /**
   * Handles an HTTP request.
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @param {{type: string; quality: number}[]} variants Allowed variants.
   * @param {module:stream.internal.Writable} stdout Output stream.
   * @param {module:stream.internal.Writable} stderr Error output stream.
   * @param {module:http.IncomingMessage} request Request object.
   * @param {module:http.ServerResponse} response Response object.
   */
  public async handleRequest(
    engine: QueryEngineBase,
    variants: { type: string; quality: number }[],
    stdout: Writable,
    stderr: Writable,
    request: http.IncomingMessage,
    response: http.ServerResponse,
  ): Promise<void> {
    const negotiated = require('negotiate').choose(variants, request)
      .sort((first: any, second: any) => second.qts - first.qts);
    const variant: any = request.headers.accept ? negotiated[0] : null;
    // Require qts strictly larger than 2, as 1 and 2 respectively allow * and */* matching.
    // For qts 0, 1, and 2, we fallback to our built-in media type defaults, for which we pass null.
    const mediaType: string = variant && variant.qts > 2 ? variant.type : null;

    // Verify the path
    const requestUrl = url.parse(request.url ?? '', true);
    if (requestUrl.pathname === '/' || request.url === '/') {
      stdout.write('[301] Permanently moved. Redirected to /sparql.');
      response.writeHead(301,
        { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON,
          'Access-Control-Allow-Origin': '*',
          Location: `http://localhost:${this.port}/sparql${requestUrl.search || ''}` });
      response.end(JSON.stringify({ message: 'Queries are accepted on /sparql. Redirected.' }));
      return;
    }
    if (requestUrl.pathname !== '/sparql') {
      stdout.write('[404] Resource not found. Queries are accepted on /sparql.\n');
      response.writeHead(404,
        { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON,
          'Access-Control-Allow-Origin': '*' });
      response.end(JSON.stringify({ message: 'Resource not found. Queries are accepted on /sparql.' }));
      return;
    }

    if (this.invalidateCacheBeforeQuery) {
      // Invalidate cache
      await engine.invalidateHttpCache();
    }

    // Parse the query, depending on the HTTP method
    let queryBody: IQueryBody | undefined;
    switch (request.method) {
      case 'POST':
        queryBody = await this.parseBody(request);
        await this.writeQueryResult(
          engine,
          stdout,
          stderr,
          request,
          response,
          queryBody,
          mediaType,
          false,
          false,
          this.lastQueryId++,
        );
        break;
      case 'HEAD':
      case 'GET':
        // eslint-disable-next-line no-case-declarations
        const queryValue = <string> requestUrl.query.query;
        queryBody = queryValue ? { type: 'query', value: queryValue, context: undefined } : undefined;
        // eslint-disable-next-line no-case-declarations
        const headOnly = request.method === 'HEAD';
        await this.writeQueryResult(
          engine,
          stdout,
          stderr,
          request,
          response,
          queryBody,
          mediaType,
          headOnly,
          true,
          this.lastQueryId++,
        );
        break;
      default:
        stdout.write(`[405] ${request.method} to ${request.url}\n`);
        response.writeHead(405,
          { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON, 'Access-Control-Allow-Origin': '*' });
        response.end(JSON.stringify({ message: 'Incorrect HTTP method' }));
    }
  }

  /**
   * Writes the result of the given SPARQL query.
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @param {module:stream.internal.Writable} stdout Output stream.
   * @param {module:stream.internal.Writable} stderr Error output stream.
   * @param {module:http.IncomingMessage} request Request object.
   * @param {module:http.ServerResponse} response Response object.
   * @param {IQueryBody | undefined} queryBody The query body.
   * @param {string} mediaType The requested response media type.
   * @param {boolean} headOnly If only the header should be written.
   * @param {boolean} readOnly If only data can be read, but not updated. (i.e., if we're in a GET request)
   * @param queryId The unique id of this query.
   */
  public async writeQueryResult(
    engine: QueryEngineBase,
    stdout: Writable,
    stderr: Writable,
    request: http.IncomingMessage,
    response: http.ServerResponse,
    queryBody: IQueryBody | undefined,
    mediaType: string,
    headOnly: boolean,
    readOnly: boolean,
    queryId: number,
  ): Promise<void> {
    if (!queryBody || !queryBody.value) {
      return this.writeServiceDescription(engine, stdout, stderr, request, response, mediaType, headOnly);
    }

    // Log the start of the query execution
    stdout.write(`[200] ${request.method} to ${request.url}\n`);
    stdout.write(`      Requested media type: ${mediaType}\n`);
    stdout.write(`      Received ${queryBody.type} query: ${queryBody.value}\n`);

    // Send message to master process to indicate the start of an execution
    process.send!({ type: 'start', queryId });

    // Determine context
    let context = {
      ...this.context,
      ...this.contextOverride ? queryBody.context : undefined,
    };
    if (readOnly) {
      context = { ...context, [KeysQueryOperation.readOnly.name]: readOnly };
    }

    let result: QueryType;
    try {
      result = await engine.query(queryBody.value, context);

      // For update queries, also await the result
      if (result.resultType === 'void') {
        await result.execute();
      }
    } catch (error: unknown) {
      stdout.write('[400] Bad request\n');
      response.writeHead(400,
        { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' });
      response.end((<Error> error).message);
      return;
    }

    // Default to SPARQL JSON for bindings and boolean
    if (!mediaType) {
      switch (result.resultType) {
        case 'quads':
          mediaType = 'application/trig';
          break;
        case 'void':
          mediaType = 'simple';
          break;
        default:
          mediaType = 'application/sparql-results+json';
          break;
      }
    }

    // Write header of response
    response.writeHead(200, { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });
    stdout.write(`      Resolved to result media type: ${mediaType}\n`);

    // Stop further processing for HEAD requests
    if (headOnly) {
      response.end();
      return;
    }

    let eventEmitter: EventEmitter | undefined;
    try {
      const { data } = await engine.resultToString(result, mediaType);
      data.on('error', (error: Error) => {
        stdout.write(`[500] Server error in results: ${error.message} \n`);
        if (!response.writableEnded) {
          response.end('An internal server error occurred.\n');
        }
      });
      data.pipe(response);
      eventEmitter = data;
    } catch {
      stdout.write('[400] Bad request, invalid media type\n');
      response.writeHead(400,
        { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' });
      response.end('The response for the given query could not be serialized for the requested media type\n');
    }

    // Send message to master process to indicate the end of an execution
    response.on('close', () => {
      process.send!({ type: 'end', queryId });
    });

    this.stopResponse(response, queryId, eventEmitter);
  }

  public async writeServiceDescription(
    engine: QueryEngineBase,
    stdout: Writable,
    stderr: Writable,
    request: http.IncomingMessage,
    response: http.ServerResponse,
    mediaType: string,
    headOnly: boolean,
  ): Promise<void> {
    stdout.write(`[200] ${request.method} to ${request.url}\n`);
    stdout.write(`      Requested media type: ${mediaType}\n`);
    stdout.write('      Received query for service description.\n');
    response.writeHead(200, { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });

    if (headOnly) {
      response.end();
      return;
    }

    // eslint-disable-next-line id-length
    const s = request.url;
    const sd = 'http://www.w3.org/ns/sparql-service-description#';
    const quads: RDF.Quad[] = [
      // Basic metadata
      quad(s, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', `${sd}Service`),
      quad(s, `${sd}endpoint`, '/sparql'),
      quad(s, `${sd}url`, '/sparql'),

      // Features
      quad(s, `${sd}feature`, `${sd}BasicFederatedQuery`),
      quad(s, `${sd}supportedLanguage`, `${sd}SPARQL10Query`),
      quad(s, `${sd}supportedLanguage`, `${sd}SPARQL11Query`),
    ];

    let eventEmitter: EventEmitter;
    try {
      // Append result formats
      const formats = await engine.getResultMediaTypeFormats(new ActionContext(this.context));
      for (const format in formats) {
        quads.push(quad(s, `${sd}resultFormat`, formats[format]));
      }

      // Flush results
      const { data } = await engine.resultToString(<QueryQuads> {
        resultType: 'quads',
        execute: async() => new ArrayIterator(quads),
        metadata: <any> undefined,
      }, mediaType);
      data.on('error', (error: Error) => {
        stdout.write(`[500] Server error in results: ${error.message} \n`);
        response.end('An internal server error occurred.\n');
      });
      data.pipe(response);
      eventEmitter = data;
    } catch {
      stdout.write('[400] Bad request, invalid media type\n');
      response.writeHead(400,
        { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' });
      response.end('The response for the given query could not be serialized for the requested media type\n');
      return;
    }
    this.stopResponse(response, 0, eventEmitter);
  }

  /**
   * Stop after timeout or if the connection is terminated
   * @param {module:http.ServerResponse} response Response object.
   * @param queryId The unique query id.
   * @param {NodeJS.ReadableStream} eventEmitter Query result stream.
   */
  public stopResponse(response: http.ServerResponse, queryId: number, eventEmitter?: EventEmitter): void {
    response.on('close', killClient);
    // eslint-disable-next-line @typescript-eslint/no-this-alias,consistent-this
    const self = this;
    function killClient(): void {
      if (eventEmitter) {
        // Remove all listeners so we are sure no more write calls are made
        eventEmitter.removeAllListeners();
        eventEmitter.on('error', () => {
          // Void any errors that may still occur
        });
        eventEmitter.emit('end');
      }
      try {
        response.end();
      } catch {
        // Do nothing
      }

      // Kill the worker if we want fresh workers per query
      if (self.freshWorkerPerQuery) {
        process.stderr.write(`Killing fresh worker ${process.pid} after query ${queryId}.\n`);
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(15);
      }
    }
  }

  /**
   * Parses the body of a SPARQL POST request
   * @param {module:http.IncomingMessage} request Request object.
   * @return {Promise<IQueryBody>} A promise resolving to a query body object.
   */
  public parseBody(request: http.IncomingMessage): Promise<IQueryBody> {
    return new Promise((resolve, reject) => {
      let body = '';
      request.setEncoding('utf8');
      request.on('error', reject);
      request.on('data', chunk => {
        body += chunk;
      });
      request.on('end', () => {
        const contentType: string | undefined = request.headers['content-type'];
        if (contentType) {
          if (contentType.includes('application/sparql-query')) {
            return resolve({ type: 'query', value: body, context: undefined });
          }
          if (contentType.includes('application/sparql-update')) {
            return resolve({ type: 'void', value: body, context: undefined });
          }
          if (contentType.includes('application/x-www-form-urlencoded')) {
            const bodyStructure = querystring.parse(body);
            let context: Record<string, any> | undefined;
            if (bodyStructure.context) {
              try {
                context = JSON.parse(<string>bodyStructure.context);
              } catch (error: unknown) {
                reject(new Error(`Invalid POST body with context received ('${bodyStructure.context}'): ${(<Error> error).message}`));
              }
            }
            if (bodyStructure.query) {
              return resolve({ type: 'query', value: <string> bodyStructure.query, context });
            }
            if (bodyStructure.update) {
              return resolve({ type: 'void', value: <string> bodyStructure.update, context });
            }
          }
        }
        reject(new Error(`Invalid POST body received, query type could not be determined`));
      });
    });
  }
}

export interface IQueryBody {
  type: 'query' | 'void';
  value: string;
  context: Record<string, any> | undefined;
}

export interface IHttpServiceSparqlEndpointArgs extends IDynamicQueryEngineOptions {
  context?: any;
  timeout?: number;
  port?: number;
  workers?: number;
  invalidateCacheBeforeQuery?: boolean;
  freshWorkerPerQuery?: boolean;
  contextOverride?: boolean;
  moduleRootPath: string;
  defaultConfigPath: string;
}
/* eslint-enable import/no-nodejs-modules */
