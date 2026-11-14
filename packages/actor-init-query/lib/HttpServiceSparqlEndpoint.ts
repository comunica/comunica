/* eslint-disable import/no-nodejs-modules,ts/no-require-imports,ts/no-var-requires */
import type { Cluster } from 'node:cluster';
import type { EventEmitter } from 'node:events';
import * as fs from 'node:fs';
import * as http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import * as path from 'node:path';
import * as querystring from 'node:querystring';
import type { Writable } from 'node:stream';
import type { TLSSocket } from 'node:tls';
import * as url from 'node:url';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { ICliArgsHandler, QueryQuads, QueryType } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraTransformer } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';

import yargs from 'yargs';

import type { IDynamicQueryEngineOptions } from '..';

import { QueryEngineBase, QueryEngineFactoryBase } from '..';

import { CliArgsHandlerBase } from './cli/CliArgsHandlerBase';
import { CliArgsHandlerHttp } from './cli/CliArgsHandlerHttp';
import type { IGraphStoreResult } from './HttpServiceGraphStore';
import { HttpServiceGraphStore } from './HttpServiceGraphStore';
import { VoidMetadataEmitter } from './VoidMetadataEmitter';

// Use require instead of import for default exports, to be compatible with variants of esModuleInterop in tsconfig.
const clusterUntyped = require('node:cluster');
const process: NodeJS.Process = require('process/');
const quad = require('rdf-quad');

// Force type on Cluster, because there are issues with the Node.js typings since v18
const cluster: Cluster = clusterUntyped;

const DF = new DataFactory();

/**
 * The URL parameters through which the SPARQL protocol allows an RDF dataset to be specified,
 * for query requests and update requests respectively.
 */
const DATASET_PARAMETERS: Record<IQueryBody['type'], { default: string; named: string }> = {
  query: { default: 'default-graph-uri', named: 'named-graph-uri' },
  void: { default: 'using-graph-uri', named: 'using-named-graph-uri' },
};

/**
 * An HTTP service that exposes a Comunica engine as a SPARQL endpoint.
 */
export class HttpServiceSparqlEndpoint {
  public static readonly MIME_PLAIN = 'text/plain';
  public static readonly MIME_JSON = 'application/json';
  public static readonly MIME_HTML = 'text/html';
  /**
   * The query format that is accepted in the body of HTTP QUERY requests (RFC 10008).
   */
  public static readonly MIME_SPARQL_QUERY = 'application/sparql-query';
  /**
   * The HTTP methods this service handles, as advertised via the `Allow` and `Access-Control-Allow-Methods` headers.
   */
  public static readonly ALLOWED_METHODS = 'GET, HEAD, OPTIONS, POST, QUERY';

  /**
   * The maximum number of distinct request headers for which negotiated media types are cached.
   */
  public static readonly NEGOTIATION_CACHE_SIZE = 1_000;

  public readonly engine: Promise<QueryEngineBase>;

  public readonly context: any;
  public readonly timeout: number;
  public readonly port: number;
  public readonly workers: number;

  public readonly freshWorkerPerQuery: boolean;
  public readonly contextOverride: boolean;
  public readonly emitVoid: boolean;
  public readonly warmup: number;

  public readonly voidMetadataEmitter: VoidMetadataEmitter;
  public readonly graphStore: HttpServiceGraphStore | undefined;

  public lastQueryId = 0;

  /**
   * Ends all open connections and stops this worker, once it runs as a worker.
   */
  public shutdownWorker: (() => Promise<void>) | undefined;

  /**
   * Serialized service descriptions of the endpoint URL, by media type.
   */
  private readonly serviceDescriptions = new Map<string, Buffer>();

  /**
   * Negotiated media types by request headers, for each set of allowed variants.
   */
  private readonly negotiatedMediaTypes = new WeakMap<object, Map<string, string | null>>();

  public constructor(args: IHttpServiceSparqlEndpointArgs) {
    this.context = args.context || {};
    this.timeout = args.timeout ?? 60_000;
    this.port = args.port ?? 3_000;
    this.workers = args.workers ?? 1;
    this.freshWorkerPerQuery = Boolean(args.freshWorkerPerQuery);
    this.contextOverride = Boolean(args.contextOverride);
    this.emitVoid = Boolean(args.emitVoid);
    this.warmup = args.warmup ?? 0;
    this.voidMetadataEmitter = new VoidMetadataEmitter(this.context);
    this.graphStore = args.graphStore ? new HttpServiceGraphStore(this.context) : undefined;

    this.engine = args.engine ?
      Promise.resolve(args.engine) :
      new QueryEngineFactoryBase(
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
  public static async runArgsInProcess(
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

    return new Promise<void>((resolve) => {
      new HttpServiceSparqlEndpoint(options || {}).run(stdout, stderr)
        .then(resolve)
        .catch((error) => {
          stderr.write(error);
          exit(1);
          resolve();
        });
    });
  }

  /**
   * Takes parsed commandline arguments and turns them into an object used in the HttpServiceSparqlEndpoint constructor
   * @param {args: string[]} argv The commandline arguments that the script was called with
   * @param {string} moduleRootPath The path to the invoking module.
   * @param {NodeJS.ProcessEnv} env The process env to get constants from.
   * @param {string} defaultConfigPath The path to get the config from if none is defined in the environment.
   * @param stderr The error stream.
   * @param exit An exit process callback.
   * @param {ICliArgsHandler[]} cliArgsHandlers Enables manipulation of the CLI arguments and their processing.
   */
  public static async generateConstructorArguments(
    argv: string[],
    moduleRootPath: string,
    env: NodeJS.ProcessEnv,
    defaultConfigPath: string,
    stderr: Writable,
    exit: (code: number) => void,
    cliArgsHandlers: ICliArgsHandler[],
  ): Promise<IHttpServiceSparqlEndpointArgs> {
    // Populate yargs arguments object
    cliArgsHandlers = [
      new CliArgsHandlerBase(),
      new CliArgsHandlerHttp(),
      ...cliArgsHandlers,
    ];
    let argumentsBuilder = yargs([]);
    for (const cliArgsHandler of cliArgsHandlers) {
      argumentsBuilder = cliArgsHandler.populateYargs(argumentsBuilder);
    }

    // Extract raw argument values from parsed yargs object, so that we can handle each of them hereafter
    let args: Record<string, any>;
    try {
      args = await argumentsBuilder.parse(argv);
    } catch (error: unknown) {
      stderr.write(`${await argumentsBuilder.getHelp()}\n\n${(<Error> error).message}\n`);
      return <any> exit(1);
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

    const freshWorkerPerQuery: boolean = args.freshWorker;
    const contextOverride: boolean = args.contextOverride;
    const emitVoid: boolean = args.emitVoid;
    const warmup: number = args.warmup;
    const graphStore: boolean = args.graphStore;
    const port = args.port;
    const timeout = args.timeout * 1_000;
    const workers = args.workers;
    context[KeysQueryOperation.readOnly.name] = !args.u;

    const configPath = env.COMUNICA_CONFIG ? env.COMUNICA_CONFIG : defaultConfigPath;

    return {
      defaultConfigPath,
      configPath,
      context,
      freshWorkerPerQuery,
      contextOverride,
      emitVoid,
      graphStore,
      moduleRootPath,
      mainModulePath: moduleRootPath,
      port,
      timeout,
      warmup,
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
    cluster.on('listening', (worker) => {
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
    });

    // Disconnect from cluster on SIGINT, so that the process can cleanly terminate
    process.once('SIGINT', () => {
      cluster.disconnect();
    });
  }

  /**
   * Warm up the engine over the sources of this endpoint, so that the just-in-time compiler has optimized the
   * engine before it handles requests.
   * Failures are logged, but do not prevent the worker from starting.
   * @param engine A SPARQL engine.
   * @param stderr Error stream to write to.
   */
  public async warmUp(engine: QueryEngineBase, stderr: Writable): Promise<void> {
    const start = Date.now();
    try {
      const { executions } = await engine.warmup(this.context, {
        executions: this.warmup,
        budget: this.timeout,
      });
      stderr.write(`Worker ${process.pid} warmed up with ${executions} query executions in ${Date.now() - start} ms.\n`);
    } catch (error: unknown) {
      stderr.write(`Worker ${process.pid} could not warm up: ${(<Error> error).message}\n`);
    }
  }

  /**
   * Stop this worker because a query took longer than the timeout.
   * The main process then starts a new worker.
   * @param queryId The id of the query that timed out.
   * @param stderr Error stream to write to.
   */
  public timeOutQuery(queryId: number, stderr: Writable): void {
    stderr.write(`Worker ${process.pid} timed out for query ${queryId}.\n`);
    // eslint-disable-next-line ts/no-floating-promises
    this.shutdownWorker?.();
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

    // Warm up before accepting requests, so that they are not slowed down by just-in-time compilation
    if (this.warmup > 0) {
      await this.warmUp(engine, stderr);
    }

    // Start the server
    // eslint-disable-next-line ts/no-misused-promises
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

    // Shut down on query timeouts and shutdown messages, after ending all open connections
    this.shutdownWorker = async(): Promise<void> => {
      stderr.write(`Shutting down worker ${process.pid} with ${openConnections.size} open connections.\n`);

      // Stop new connections from being accepted
      server.close();

      // Close all open connections
      for (const connection of openConnections) {
        await new Promise<void>(resolve => connection.end('!TIMEDOUT!', resolve));
      }

      // Kill the worker once the connections have been closed
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(15);
    };

    // Subscribe to shutdown messages
    // eslint-disable-next-line ts/no-misused-promises
    process.on('message', async(message: string): Promise<void> => {
      if (message === 'shutdown') {
        await this.shutdownWorker!();
      }
    });

    // Catch global errors, and cleanly close open connections
    // eslint-disable-next-line ts/no-misused-promises
    process.on('uncaughtException', async(error) => {
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
   * Determine the media type of the response, or null to fall back to the default media type of the result.
   * @param {{type: string; quality: number}[]} variants Allowed variants.
   * @param {module:http.IncomingMessage} request Request object.
   */
  public negotiateMediaType(
    variants: { type: string; quality: number }[],
    request: http.IncomingMessage,
  ): string | null {
    const accept = request.headers.accept;
    if (!accept) {
      return null;
    }
    // Besides the accept header, negotiation looks at the charset, encoding, and language headers
    const key = [
      accept,
      request.headers['accept-charset'],
      request.headers['accept-encoding'],
      request.headers['accept-language'],
    ].join('\n');
    let cache = this.negotiatedMediaTypes.get(variants);
    if (!cache) {
      cache = new Map();
      this.negotiatedMediaTypes.set(variants, cache);
    }
    let mediaType = cache.get(key);
    if (mediaType === undefined) {
      const negotiated = require('negotiate').choose(variants, request)
        .sort((first: any, second: any) => second.qts - first.qts);
      const variant: any = negotiated[0];
      // Require qts strictly larger than 2, as 1 and 2 respectively allow * and */* matching.
      // For qts 0, 1, and 2, we fallback to our built-in media type defaults, for which we pass null.
      mediaType = variant && variant.qts > 2 ? <string> variant.type : null;
      if (cache.size >= HttpServiceSparqlEndpoint.NEGOTIATION_CACHE_SIZE) {
        cache.clear();
      }
      cache.set(key, mediaType);
    }
    return mediaType;
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
    const mediaType: string = <string> this.negotiateMediaType(variants, request);

    // Verify the path
    // eslint-disable-next-line node/no-deprecated-api
    const requestUrl = url.parse(request.url ?? '', true);
    if (requestUrl.pathname === '/' || request.url === '/') {
      stdout.write('[301] Permanently moved. Redirected to /sparql.\n');
      response.writeHead(301, { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON, 'Access-Control-Allow-Origin': '*', Location: `http://localhost:${this.port}/sparql${requestUrl.search ?? ''}` });
      response.end(JSON.stringify({ message: 'Queries are accepted on /sparql. Redirected.' }));
      return;
    }
    // Requests to the graph store are handled through the Graph Store HTTP Protocol, when it is enabled
    if (this.graphStore) {
      const graphStoreIri = HttpServiceSparqlEndpoint.getBaseIRI(request, this.port, HttpServiceGraphStore.PATH);
      const graphStoreTarget = HttpServiceGraphStore.getTarget(request, requestUrl, graphStoreIri);
      if (graphStoreTarget && request.method === 'OPTIONS') {
        this.writePreflightResponse(
          stdout,
          request,
          response,
          HttpServiceGraphStore.getMethodAdvertisementHeaders(graphStoreTarget),
        );
        return;
      }
      if (graphStoreTarget) {
        const result = await this.graphStore.handleRequest(
          engine,
          request,
          graphStoreTarget,
          graphStoreIri,
          () => HttpServiceSparqlEndpoint.readBody(request),
        );
        await this.writeGraphStoreResult(engine, stdout, request, response, result, mediaType);
        return;
      }
    }

    if (requestUrl.pathname !== '/sparql') {
      stdout.write('[404] Resource not found. Queries are accepted on /sparql.\n');
      response.writeHead(
        404,
        { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON, 'Access-Control-Allow-Origin': '*' },
      );
      response.end(JSON.stringify({ message: 'Resource not found. Queries are accepted on /sparql.' }));
      return;
    }

    // Parse the query, depending on the HTTP method
    let queryBody: IQueryBody | undefined;
    switch (request.method) {
      case 'POST':
      case 'QUERY':
        try {
          queryBody = await this.parseBody(request);
        } catch (error: unknown) {
          this.writeBadRequest(stdout, response, (<Error> error).message);
          return;
        }
        await this.writeQueryResult(
          engine,
          stdout,
          stderr,
          request,
          response,
          queryBody,
          mediaType,
          false,
          // QUERY is a safe method, so it may only read data
          request.method === 'QUERY',
          this.lastQueryId++,
        );
        break;
      case 'HEAD':
      case 'GET':
        // Updates may only be invoked through POST
        if (requestUrl.query.update) {
          this.writeBadRequest(stdout, response, 'SPARQL updates can only be invoked with a POST request');
          return;
        }
        // eslint-disable-next-line no-case-declarations
        const queryValue = requestUrl.query.query;
        if (Array.isArray(queryValue)) {
          this.writeBadRequest(stdout, response, 'A request can only contain a single query parameter');
          return;
        }
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
      case 'OPTIONS':
        this.writePreflightResponse(
          stdout,
          request,
          response,
          HttpServiceSparqlEndpoint.getMethodAdvertisementHeaders({}),
        );
        break;
      default:
        stdout.write(`[405] ${request.method} to ${request.url}\n`);
        response.writeHead(
          405,
          HttpServiceSparqlEndpoint.getMethodAdvertisementHeaders({
            'content-type': HttpServiceSparqlEndpoint.MIME_JSON,
            'Access-Control-Allow-Origin': '*',
          }),
        );
        response.end(JSON.stringify({ message: 'Incorrect HTTP method' }));
    }
  }

  /**
   * Answers a CORS preflight request, which browsers always send for the methods that are not simple:
   * QUERY, and the PUT and DELETE of the Graph Store HTTP Protocol.
   * @param {module:stream.internal.Writable} stdout Output stream.
   * @param {module:http.IncomingMessage} request Request object.
   * @param {module:http.ServerResponse} response Response object.
   * @param {Record<string, string>} methodAdvertisementHeaders The headers that advertise the allowed methods.
   */
  public writePreflightResponse(
    stdout: Writable,
    request: http.IncomingMessage,
    response: http.ServerResponse,
    methodAdvertisementHeaders: Record<string, string>,
  ): void {
    stdout.write(`[204] ${request.method} to ${request.url}\n`);
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      ...methodAdvertisementHeaders,
    });
    response.end();
  }

  /**
   * Writes a 400 response with the given message.
   * @param {module:stream.internal.Writable} stdout Output stream.
   * @param {module:http.ServerResponse} response Response object.
   * @param {string} message The reason why the request was rejected.
   */
  public writeBadRequest(stdout: Writable, response: http.ServerResponse, message: string): void {
    stdout.write(`[400] Bad request: ${message}\n`);
    response.writeHead(
      400,
      { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' },
    );
    response.end(`${message}\n`);
  }

  /**
   * Determine the base IRI that relative IRIs in a request are resolved against.
   * @param {module:http.IncomingMessage} request Request object.
   * @param {number} port The port this service is running on.
   * @param {string} path The path of the service on this server.
   * @return {string} The base IRI.
   */
  public static getBaseIRI(request: http.IncomingMessage, port: number, path = '/sparql'): string {
    const protocol = (<TLSSocket> request.socket).encrypted ? 'https' : 'http';
    return `${protocol}://${request.headers.host ?? `localhost:${port}`}${path}`;
  }

  /**
   * Determine the RDF dataset that a request specifies through the SPARQL protocol.
   * @param {module:url.UrlWithParsedQuery} requestUrl The parsed request URL.
   * @param {'query' | 'void'} type The type of operation the dataset applies to.
   * @return The graphs that form the default graph, and the named graphs.
   */
  public static getProtocolDataset(
    requestUrl: url.UrlWithParsedQuery,
    type: IQueryBody['type'],
  ): { default: RDF.NamedNode[]; named: RDF.NamedNode[] } {
    const parameters = DATASET_PARAMETERS[type];
    const toGraphs = (value: string | string[] | undefined): RDF.NamedNode[] =>
      (value === undefined ? [] : (Array.isArray(value) ? value : [ value ])).map(graph => DF.namedNode(graph));
    return {
      default: toGraphs(requestUrl.query[parameters.default]),
      named: toGraphs(requestUrl.query[parameters.named]),
    };
  }

  /**
   * Apply the dataset that a request specifies through the SPARQL protocol to the query it contains.
   * The query is returned unchanged if the request does not specify a dataset.
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @param {IQueryBody} queryBody The query body.
   * @param {module:url.UrlWithParsedQuery} requestUrl The parsed request URL.
   * @param context The query context.
   * @return {Promise<string | Algebra.Operation>} The query to execute.
   */
  public async applyProtocolDataset(
    engine: QueryEngineBase,
    queryBody: IQueryBody,
    requestUrl: url.UrlWithParsedQuery,
    context: Record<string, any>,
  ): Promise<string | Algebra.Operation> {
    const dataset = HttpServiceSparqlEndpoint.getProtocolDataset(requestUrl, queryBody.type);
    if (dataset.default.length === 0 && dataset.named.length === 0) {
      return queryBody.value;
    }

    const { data: operation } = await engine.explain(queryBody.value, <any> { ...context }, 'parsed');
    const algebraFactory = new AlgebraFactory(DF);
    if (queryBody.type === 'query') {
      // The protocol-specified dataset replaces the dataset of the query itself
      const input = operation.type === Algebra.Types.FROM ? operation.input : operation;
      return algebraFactory.createFrom(input, dataset.default, dataset.named);
    }
    return HttpServiceSparqlEndpoint.applyUpdateDataset(algebraFactory, operation, dataset);
  }

  /**
   * Apply the protocol-specified dataset to the WHERE clauses of an update operation.
   * @param {AlgebraFactory} algebraFactory An algebra factory.
   * @param {Algebra.Operation} operation An update operation.
   * @param dataset The protocol-specified dataset.
   * @param dataset.default The graphs that form the default graph.
   * @param dataset.named The named graphs.
   * @return {Algebra.Operation} The update operation with the dataset applied.
   */
  public static applyUpdateDataset(
    algebraFactory: AlgebraFactory,
    operation: Algebra.Operation,
    dataset: { default: RDF.NamedNode[]; named: RDF.NamedNode[] },
  ): Algebra.Operation {
    return algebraTransformer({ continue: false, copy: false }).transformNode(operation, {
      [Algebra.Types.COMPOSITE_UPDATE]: { preVisitor: () => ({ continue: true, copy: true }) },
      [Algebra.Types.DELETE_INSERT]: {
        transform: (deleteInsert) => {
          if (!deleteInsert.where) {
            return deleteInsert;
          }
          // The protocol does not allow a request to specify the dataset in more than one way
          if (deleteInsert.where.type === Algebra.Types.FROM) {
            throw new Error(`A request with a using-graph-uri or using-named-graph-uri parameter can not contain a USING, USING NAMED or WITH clause`);
          }
          return algebraFactory.createDeleteInsert(
            deleteInsert.delete,
            deleteInsert.insert,
            algebraFactory.createFrom(deleteInsert.where, dataset.default, dataset.named),
          );
        },
      },
    });
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
      // Check if HTML is requested
      const acceptHeader = request.headers.accept ?? '';
      if (acceptHeader.includes('text/html')) {
        return this.writeHtmlView(stdout, request, response);
      }
      return this.writeServiceDescription(engine, stdout, stderr, request, response, mediaType, headOnly);
    }

    // Log the start of the query execution
    stdout.write(`[200] ${request.method} to ${request.url}\n`);
    stdout.write(`      Requested media type: ${mediaType}\n`);
    stdout.write(`      Received ${queryBody.type} query: ${queryBody.value}\n`);

    // The worker times out its own queries, as messaging the main process for every query is costly
    stderr.write(`Worker ${process.pid} got assigned a new query (${queryId}).\n`);
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      this.timeOutQuery(queryId, stderr);
    }, this.timeout);
    response.on('close', () => {
      clearTimeout(timeout);
      if (!timedOut) {
        stderr.write(`Worker ${process.pid} has completed query ${queryId}.\n`);
      }
    });

    // Determine context
    let context = {
      [KeysInitQuery.baseIRI.name]: HttpServiceSparqlEndpoint.getBaseIRI(request, this.port),
      ...this.context,
      ...this.contextOverride ? queryBody.context : undefined,
    };
    if (readOnly) {
      context = { ...context, [KeysQueryOperation.readOnly.name]: readOnly };
    }

    let result: QueryType;
    try {
      // eslint-disable-next-line node/no-deprecated-api
      const requestUrl = url.parse(request.url ?? '', true);
      // The dataset that the request specifies through the protocol overrides the dataset of the query itself
      const query = await this.applyProtocolDataset(engine, queryBody, requestUrl, context);

      result = await engine.query(query, context);

      // For update queries, also await the result, so that failures are reported as a bad request.
      // The execution is memoized, as updates may not be executed again while serializing the result.
      if (result.resultType === 'void') {
        const executed = result.execute();
        await executed;
        result = { ...result, execute: () => executed };
      }
    } catch (error: unknown) {
      this.writeBadRequest(stdout, response, (<Error> error).message);
      return;
    }

    // If the query was an update query, invalidate the void metadata emitter cache
    if (this.emitVoid &&
      // Try to check parsed operation
      ((result.context && result.context.has(KeysQueryOperation.operation) &&
          // eslint-disable-next-line ts/prefer-nullish-coalescing
          result.context.getSafe(KeysQueryOperation.operation).type === Algebra.Types.DELETE_INSERT) ||
        // Fallback to query string
        /(INSERT|DELETE)/iu.test(queryBody.value))) {
      this.voidMetadataEmitter.invalidateCache();
      this.serviceDescriptions.clear();
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

    // Stop further processing for HEAD requests
    if (headOnly) {
      response.writeHead(200, { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });
      stdout.write(`      Resolved to result media type: ${mediaType}\n`);
      response.end();
      return;
    }

    let eventEmitter: EventEmitter | undefined;
    try {
      let serialized: { data: NodeJS.ReadableStream };
      try {
        serialized = await engine.resultToString(result, mediaType);
      } catch (error: unknown) {
        // Updates have no results, so clients that request a results format for all operations still succeed
        if (result.resultType !== 'void') {
          throw error;
        }
        mediaType = 'simple';
        serialized = await engine.resultToString(result, mediaType);
      }
      const { data } = serialized;

      // Only write the header once serialization has started, so that a failure can still be reported as such
      response.writeHead(200, { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });
      stdout.write(`      Resolved to result media type: ${mediaType}\n`);
      data.on('error', (error: Error) => {
        stdout.write(`[500] Server error in results: ${error.message} \n`);
        if (!response.writableEnded) {
          response.end('An internal server error occurred.\n');
        }
      });
      data.pipe(response);
      eventEmitter = data;
    } catch {
      this.writeBadRequest(
        stdout,
        response,
        'The response for the given query could not be serialized for the requested media type',
      );
    }

    this.stopResponse(response, queryId, process.stderr, eventEmitter);
  }

  /**
   * Writes the outcome of a request of the Graph Store HTTP Protocol.
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @param {module:stream.internal.Writable} stdout Output stream.
   * @param {module:http.IncomingMessage} request Request object.
   * @param {module:http.ServerResponse} response Response object.
   * @param {IGraphStoreResult} result The outcome of the request.
   * @param {string} mediaType The requested response media type.
   */
  public async writeGraphStoreResult(
    engine: QueryEngineBase,
    stdout: Writable,
    request: http.IncomingMessage,
    response: http.ServerResponse,
    result: IGraphStoreResult,
    mediaType: string,
  ): Promise<void> {
    if (!result.result) {
      stdout.write(`[${result.status}] ${request.method} to ${request.url}\n`);
      response.writeHead(result.status, {
        'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN,
        'Access-Control-Allow-Origin': '*',
        ...result.headers,
      });
      response.end(result.message ? `${result.message}\n` : undefined);
      return;
    }

    // Graphs are served as Turtle unless the request asks for another RDF serialization
    mediaType = mediaType || 'text/turtle';
    stdout.write(`[${result.status}] ${request.method} to ${request.url}\n`);
    stdout.write(`      Resolved to result media type: ${mediaType}\n`);
    response.writeHead(result.status, {
      'content-type': mediaType,
      'Access-Control-Allow-Origin': '*',
      ...result.headers,
    });

    // Stop further processing for HEAD requests
    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    let eventEmitter: EventEmitter;
    try {
      const { data } = await engine.resultToString(result.result, mediaType);
      data.on('error', (error: Error) => {
        stdout.write(`[500] Server error in results: ${error.message} \n`);
        if (!response.writableEnded) {
          response.end('An internal server error occurred.\n');
        }
      });
      data.pipe(response);
      eventEmitter = data;
    } catch {
      stdout.write(`      The graph could not be serialized for the requested media type\n`);
      response.end('The graph could not be serialized for the requested media type.\n');
      return;
    }
    this.stopResponse(response, this.lastQueryId++, process.stderr, eventEmitter);
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
    response.writeHead(200, HttpServiceSparqlEndpoint.getMethodAdvertisementHeaders({
      'content-type': mediaType,
      'Access-Control-Allow-Origin': '*',
      // Without this, browser clients are not allowed to read the QUERY advertisement.
      'Access-Control-Expose-Headers': 'Accept-Query, Allow',
    }));

    if (headOnly) {
      response.end();
      return;
    }

    const cacheable = request.url === '/sparql';
    const cached = cacheable ? this.serviceDescriptions.get(mediaType) : undefined;
    if (cached) {
      response.end(cached);
      this.stopResponse(response, 0, process.stderr);
      return;
    }

    const s = request.url;
    const sd = 'http://www.w3.org/ns/sparql-service-description#';
    const sparql = 'http://www.w3.org/ns/sparql#';
    const quads: RDF.Quad[] = [
      // Basic metadata
      quad(s, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', `${sd}Service`),
      quad(s, `${sd}endpoint`, '/sparql'),
      quad(s, `${sd}url`, '/sparql'),

      // Features
      quad(s, `${sd}feature`, `${sd}BasicFederatedQuery`),
      quad(s, `${sd}supportedLanguage`, `${sd}SPARQLQuery`),
      quad(s, `${sd}supportedVersion`, `${sparql}version-1.0`),
      quad(s, `${sd}supportedVersion`, `${sparql}version-1.1`),
      quad(s, `${sd}supportedVersion`, `${sparql}version-1.2`),
      quad(s, `${sd}supportedVersion`, `${sparql}version-1.2-basic`),
      quad(s, `${sd}supportedLanguage`, `${sd}SPARQL10Query`),
      quad(s, `${sd}supportedLanguage`, `${sd}SPARQL11Query`),
    ];

    let eventEmitter: EventEmitter;
    try {
      const actionContext = ActionContext.ensureActionContext(this.context);

      // Append result formats
      const formats = await engine.getResultMediaTypeFormats(actionContext);
      for (const format in formats) {
        quads.push(quad(s, `${sd}resultFormat`, formats[format]));
      }

      // Append extension functions
      const functions = actionContext.get(KeysInitQuery.extensionFunctions);
      for (const value in functions) {
        quads.push(quad(s, `${sd}extensionFunction`, value));
      }

      let complete = true;
      if (this.emitVoid) {
        const voidQuads = await this.voidMetadataEmitter.getVoIDQuads(engine, stdout, request, response);
        // Without VoID quads, computing the statistics failed, and an error was sent instead
        complete = voidQuads.length > 0;
        for (const quad of voidQuads) {
          quads.push(quad);
        }
      }

      // Flush results
      const { data } = await engine.resultToString(<QueryQuads>{
        resultType: 'quads',
        execute: async() => new ArrayIterator(quads, { autoStart: false }),
        metadata: <any>undefined,
      }, mediaType);
      let failed = false;
      data.on('error', (error: Error) => {
        failed = true;
        stdout.write(`[500] Server error in results: ${error.message} \n`);
        response.end('An internal server error occurred.\n');
      });
      if (cacheable && complete) {
        const chunks: Buffer[] = [];
        data.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
        data.on('end', () => {
          if (!failed) {
            this.serviceDescriptions.set(mediaType, Buffer.concat(chunks));
          }
        });
      }
      data.pipe(response);
      eventEmitter = data;
    } catch {
      this.writeBadRequest(
        stdout,
        response,
        'The response for the given query could not be serialized for the requested media type',
      );
      return;
    }
    this.stopResponse(response, 0, process.stderr, eventEmitter);
  }

  /**
   * Writes an HTML view with YASGUI for querying the endpoint.
   * @param {module:stream.internal.Writable} stdout Output stream.
   * @param {module:http.IncomingMessage} request Request object.
   * @param {module:http.ServerResponse} response Response object.
   */
  public async writeHtmlView(
    stdout: Writable,
    request: http.IncomingMessage,
    response: http.ServerResponse,
  ): Promise<void> {
    stdout.write(`[200] ${request.method} to ${request.url}\n`);
    stdout.write('      Returning HTML view with YASGUI.\n');

    const defaultQuery = `SELECT * WHERE {
  ?s ?p ?o
} LIMIT 100`;

    // Use the current request URL path as the endpoint
    const endpointPath = request.url ?? '/sparql';

    // Read HTML template from file
    const htmlPath = path.join(__dirname, 'sparql-endpoint.html');
    let html = await fs.promises.readFile(htmlPath, 'utf8');

    // Replace placeholders
    html = html.replaceAll('%%ENDPOINT_PATH%%', endpointPath);
    html = html.replaceAll('%%DEFAULT_QUERY%%', defaultQuery);

    response.writeHead(200, {
      'content-type': HttpServiceSparqlEndpoint.MIME_HTML,
      'Access-Control-Allow-Origin': '*',
    });
    response.end(html);
  }

  /**
   * Stop after timeout or if the connection is terminated
   * @param {module:http.ServerResponse} response Response object.
   * @param queryId The unique query id.
   * @param stderr Error stream to write to.
   * @param {NodeJS.ReadableStream} eventEmitter Query result stream.
   */
  public stopResponse(
    response: http.ServerResponse,
    queryId: number,
    stderr: Writable,
    eventEmitter?: EventEmitter,
  ): void {
    response.on('close', killClient);
    // eslint-disable-next-line ts/no-this-alias
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
        stderr.write(`Killing fresh worker ${process.pid} after query ${queryId}.\n`);
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(15);
      }
    }
  }

  /**
   * Determines the headers with which this service advertises the HTTP methods and query formats it supports.
   * @param headers The headers to extend.
   * @return {Record<string, string>} The given headers, extended with the method advertisement headers.
   */
  public static getMethodAdvertisementHeaders(headers: Record<string, string>): Record<string, string> {
    return {
      ...headers,
      'Access-Control-Allow-Methods': HttpServiceSparqlEndpoint.ALLOWED_METHODS,
      Allow: HttpServiceSparqlEndpoint.ALLOWED_METHODS,
      'Accept-Query': HttpServiceSparqlEndpoint.MIME_SPARQL_QUERY,
    };
  }

  /**
   * Reads the body of a request as a UTF-8 string.
   * @param {module:http.IncomingMessage} request Request object.
   * @return {Promise<string>} A promise resolving to the request body.
   */
  public static readBody(request: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      request.setEncoding('utf8');
      request.on('error', reject);
      request.on('data', (chunk) => {
        body += chunk;
      });
      request.on('end', () => resolve(body));
    });
  }

  /**
   * Parses the body of a SPARQL POST or QUERY request
   * @param {module:http.IncomingMessage} request Request object.
   * @return {Promise<IQueryBody>} A promise resolving to a query body object.
   */
  public async parseBody(request: http.IncomingMessage): Promise<IQueryBody> {
    const body = await HttpServiceSparqlEndpoint.readBody(request);
    const contentType: string | undefined = request.headers['content-type'];
    if (contentType) {
      if (contentType.includes(HttpServiceSparqlEndpoint.MIME_SPARQL_QUERY)) {
        return { type: 'query', value: body, context: undefined };
      }
      if (contentType.includes('application/sparql-update')) {
        return { type: 'void', value: body, context: undefined };
      }
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const bodyStructure = querystring.parse(body);
        let context: Record<string, any> | undefined;
        if (bodyStructure.context) {
          try {
            context = JSON.parse(<string>bodyStructure.context);
          } catch (error: unknown) {
            throw new Error(`Invalid POST body with context received ('${(<any> bodyStructure).context}'): ${(<Error> error).message}`);
          }
        }
        // A request may only contain a single query or update
        if (Array.isArray(bodyStructure.query) || Array.isArray(bodyStructure.update)) {
          throw new TypeError(`Invalid request body received, it can only contain a single query or update parameter`);
        }
        if (bodyStructure.query) {
          return { type: 'query', value: bodyStructure.query, context };
        }
        if (bodyStructure.update) {
          return { type: 'void', value: bodyStructure.update, context };
        }
      }
    }
    throw new Error(`Invalid request body received, query type could not be determined`);
  }
}

export interface IQueryBody {
  type: 'query' | 'void';
  value: string;
  context: Record<string, any> | undefined;
}

export interface IHttpServiceSparqlEndpointArgs extends IDynamicQueryEngineOptions {
  engine?: QueryEngineBase;
  context?: any;
  timeout?: number;
  port?: number;
  workers?: number;
  freshWorkerPerQuery?: boolean;
  contextOverride?: boolean;
  emitVoid?: boolean;
  /**
   * The number of query executions with which each worker warms up before it accepts requests.
   */
  warmup?: number;
  graphStore?: boolean;
  moduleRootPath: string;
  defaultConfigPath: string;
}
/* eslint-enable import/no-nodejs-modules */
