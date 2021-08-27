import * as cluster from 'cluster';
import type { EventEmitter } from 'events';

import * as http from 'http';
import * as querystring from 'querystring';
import type { Writable } from 'stream';
import * as url from 'url';
import { KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActorQueryOperationOutput,
  IActorQueryOperationOutputQuads, IActorQueryOperationOutputUpdate } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import yargs from 'yargs';
import { newEngineDynamic } from '..';
import type { ICliArgsHandler } from '..';
import type { ActorInitSparql } from './ActorInitSparql';
import { CliArgsHandlerBase } from './cli/CliArgsHandlerBase';
import { CliArgsHandlerHttp } from './cli/CliArgsHandlerHttp';
import type { IQueryOptions } from './QueryDynamic';

const quad = require('rdf-quad');

/**
 * An HTTP service that exposes a Comunica engine as a SPARQL endpoint.
 */
export class HttpServiceSparqlEndpoint {
  public static readonly MIME_PLAIN = 'text/plain';
  public static readonly MIME_JSON = 'application/json';

  public readonly engine: Promise<ActorInitSparql>;

  public readonly context: any;
  public readonly timeout: number;
  public readonly port: number;
  public readonly workers: number;

  public readonly invalidateCacheBeforeQuery: boolean;

  public constructor(args?: IHttpServiceSparqlEndpointArgs) {
    args = args ?? {};
    this.context = args.context || {};
    this.timeout = args.timeout ?? 60_000;
    this.port = args.port ?? 3_000;
    this.workers = args.workers ?? 1;
    this.invalidateCacheBeforeQuery = Boolean(args.invalidateCacheBeforeQuery);

    this.engine = newEngineDynamic(args);
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
  public static async runArgsInProcess(argv: string[], stdout: Writable, stderr: Writable,
    moduleRootPath: string, env: NodeJS.ProcessEnv,
    defaultConfigPath: string, exit: (code: number) => void, cliArgsHandlers: ICliArgsHandler[] = []): Promise<void> {
    const options = await HttpServiceSparqlEndpoint
      .generateConstructorArguments(argv, moduleRootPath, env, defaultConfigPath, stderr, exit, cliArgsHandlers);

    return new Promise<void>(resolve => {
      new HttpServiceSparqlEndpoint(options).run(stdout, stderr)
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
    const port = args.port;
    const timeout = args.timeout * 1_000;
    const workers = args.workers;
    context[KeysQueryOperation.readOnly] = !args.u;

    const configResourceUrl = env.COMUNICA_CONFIG ? env.COMUNICA_CONFIG : defaultConfigPath;

    return {
      configResourceUrl,
      context,
      invalidateCacheBeforeQuery,
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
          stderr.write(`Worker ${worker.process.pid} died with ${code || signal}. Starting new worker.\n`);
          cluster.fork();
        }
      });

      // Handle worker timeouts
      let workerTimeout: NodeJS.Timeout | undefined;
      worker.on('message', message => {
        if (message === 'start') {
          workerTimeout = setTimeout(() => {
            stderr.write(`Worker ${worker.process.pid} timed out.\n`);
            worker.send('shutdown');
            workerTimeout = undefined;
          }, this.timeout);
        } else if (message === 'end' && workerTimeout) {
          clearTimeout(workerTimeout);
          workerTimeout = undefined;
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
    const engine: ActorInitSparql = await this.engine;

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
  }

  /**
   * Handles an HTTP request.
   * @param {ActorInitSparql} engine A SPARQL engine.
   * @param {{type: string; quality: number}[]} variants Allowed variants.
   * @param {module:stream.internal.Writable} stdout Output stream.
   * @param {module:stream.internal.Writable} stderr Error output stream.
   * @param {module:http.IncomingMessage} request Request object.
   * @param {module:http.ServerResponse} response Response object.
   */
  public async handleRequest(engine: ActorInitSparql, variants: { type: string; quality: number }[],
    stdout: Writable, stderr: Writable,
    request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
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
        await this.writeQueryResult(engine, stdout, stderr, request, response, queryBody, mediaType, false, false);
        break;
      case 'HEAD':
      case 'GET':
        // eslint-disable-next-line no-case-declarations
        const queryValue = <string> requestUrl.query.query;
        queryBody = queryValue ? { type: 'query', value: queryValue } : undefined;
        // eslint-disable-next-line no-case-declarations
        const headOnly = request.method === 'HEAD';
        await this.writeQueryResult(engine, stdout, stderr, request, response, queryBody, mediaType, headOnly, true);
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
   * @param {ActorInitSparql} engine A SPARQL engine.
   * @param {module:stream.internal.Writable} stdout Output stream.
   * @param {module:stream.internal.Writable} stderr Error output stream.
   * @param {module:http.IncomingMessage} request Request object.
   * @param {module:http.ServerResponse} response Response object.
   * @param {IQueryBody | undefined} queryBody The query body.
   * @param {string} mediaType The requested response media type.
   * @param {boolean} headOnly If only the header should be written.
   * @param {boolean} readOnly If only data can be read, but not updated. (i.e., if we're in a GET request)
   */
  public async writeQueryResult(engine: ActorInitSparql, stdout: Writable, stderr: Writable,
    request: http.IncomingMessage, response: http.ServerResponse,
    queryBody: IQueryBody | undefined, mediaType: string, headOnly: boolean, readOnly: boolean): Promise<void> {
    if (!queryBody || !queryBody.value) {
      return this.writeServiceDescription(engine, stdout, stderr, request, response, mediaType, headOnly);
    }

    // Determine context
    let context = this.context;
    if (readOnly) {
      context = { ...context, [KeysQueryOperation.readOnly]: readOnly };
    }

    let result: IActorQueryOperationOutput;
    try {
      result = await engine.query(queryBody.value, context);

      // For update queries, also await the result
      if (result.type === 'update') {
        await (<IActorQueryOperationOutputUpdate> result).updateResult;
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
      switch (result.type) {
        case 'quads':
          mediaType = 'application/trig';
          break;
        case 'update':
          mediaType = 'simple';
          break;
        default:
          mediaType = 'application/sparql-results+json';
          break;
      }
    }

    stdout.write(`[200] ${request.method} to ${request.url}\n`);
    stdout.write(`      Requested media type: ${mediaType}\n`);
    stdout.write(`      Received ${queryBody.type} query: ${queryBody.value}\n`);
    response.writeHead(200, { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });

    if (headOnly) {
      response.end();
      return;
    }

    // Send message to master process to indicate the start of an execution
    process.send!('start');

    // Listen for shutdown events from master for timeouts
    const messageListener = (message: string): void => {
      if (message === 'shutdown') {
        response.end('!TIMED OUT!');
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(9);
      }
    };
    process.on('message', messageListener);

    let eventEmitter: EventEmitter | undefined;
    try {
      const { data } = await engine.resultToString(result, mediaType);
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
    }

    // Send message to master process to indicate the end of an execution
    response.on('close', () => {
      process.removeListener('message', messageListener);
      process.send!('end');
    });

    this.stopResponse(response, eventEmitter);
  }

  public async writeServiceDescription(engine: ActorInitSparql, stdout: Writable, stderr: Writable,
    request: http.IncomingMessage, response: http.ServerResponse,
    mediaType: string, headOnly: boolean): Promise<void> {
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
      const formats = await engine.getResultMediaTypeFormats(ActionContext(this.context));
      for (const format in formats) {
        quads.push(quad(s, `${sd}resultFormat`, formats[format]));
      }

      // Flush results
      const { data } = await engine.resultToString(<IActorQueryOperationOutputQuads> {
        type: 'quads',
        quadStream: new ArrayIterator(quads),
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
    this.stopResponse(response, eventEmitter);
  }

  /**
   * Stop after timeout or if the connection is terminated
   * @param {module:http.ServerResponse} response Response object.
   * @param {NodeJS.ReadableStream} eventEmitter Query result stream.
   */
  public stopResponse(response: http.ServerResponse, eventEmitter?: EventEmitter): void {
    response.on('close', killClient);
    function killClient(): void {
      if (eventEmitter) {
        // Remove all listeners so we are sure no more write calls are made
        eventEmitter.removeAllListeners();
        eventEmitter.emit('end');
      }
      try {
        response.end();
      } catch {
        // Do nothing
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
            return resolve({ type: 'query', value: body });
          }
          if (contentType.includes('application/sparql-update')) {
            return resolve({ type: 'update', value: body });
          }
          if (contentType.includes('application/x-www-form-urlencoded')) {
            const bodyStructure = querystring.parse(body);
            if (bodyStructure.query) {
              return resolve({ type: 'query', value: <string> bodyStructure.query });
            }
            if (bodyStructure.update) {
              return resolve({ type: 'update', value: <string> bodyStructure.update });
            }
          }
        }
        reject(new Error(`Invalid POST body received, query type could not be determined`));
      });
    });
  }
}

export interface IQueryBody {
  type: 'query' | 'update';
  value: string;
}

export interface IHttpServiceSparqlEndpointArgs extends IQueryOptions {
  context?: any;
  timeout?: number;
  port?: number;
  workers?: number;
  invalidateCacheBeforeQuery?: boolean;
}
