import type { Worker, Cluster } from 'node:cluster';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Writable } from 'node:stream';
import { inspect } from 'node:util';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { ICliArgsHandler, QueryType, QueryStringContext, IQueryQuadsEnhanced } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import yargs from 'yargs';
import type { ActorInitQuery } from './ActorInitQuery';
import { CliArgsHandlerBase } from './cli/CliArgsHandlerBase';
import { CliArgsHandlerHttp } from './cli/CliArgsHandlerHttp';
import { QueryEngineBase } from './QueryEngineBase';
import { QueryEngineFactoryBase } from './QueryEngineFactoryBase';
import type { IDynamicQueryEngineOptions } from './QueryEngineFactoryBase';

// The cluster module seemingly breaks when imported in CommonJS
const cluster: Cluster = require('node:cluster');

// The HTTP content negotiation library is missing all types, hence this workaround
const negotiate: {
  choose: (variants: { type: string; q: number }[], request: IncomingMessage) => { type: string; qts: number }[];
} = require('negotiate');

// Use require instead of import for default exports, to be compatible with variants of esModuleInterop in tsconfig.
const process: NodeJS.Process = require('process/');

const DF = new DataFactory();

/**
 * An HTTP service that exposes a Comunica engine as a SPARQL endpoint.
 */
export class HttpServiceSparqlEndpoint {
  protected readonly port: number;
  protected readonly timeout: number;
  protected readonly workers: number;
  protected readonly context: QueryStringContext;
  protected readonly invalidateCacheBeforeQuery: boolean;
  protected readonly freshWorkerPerQuery: boolean;
  protected readonly allowContextOverride: boolean;
  protected readonly endpointPath: string = '/sparql';
  protected readonly engineFactory: QueryEngineFactoryBase<QueryEngineBase>;
  protected readonly engineWrapper: (actorInitQuery: ActorInitQuery) => QueryEngineBase;

  public constructor(args: IHttpServiceSparqlEndpointArgs) {
    this.context = args.context || {};
    this.timeout = args.timeout ?? 60_000;
    this.port = args.port ?? 3_000;
    this.workers = args.workers ?? 1;
    this.invalidateCacheBeforeQuery = Boolean(args.invalidateCacheBeforeQuery);
    this.freshWorkerPerQuery = Boolean(args.freshWorkerPerQuery);
    this.allowContextOverride = Boolean(args.allowContextOverride);
    this.engineWrapper = actorInitQuery => new QueryEngineBase(actorInitQuery);
    this.engineFactory = new QueryEngineFactoryBase(
      args.moduleRootPath,
      args.defaultConfigPath,
      this.engineWrapper,
    );
  }

  /**
   * Start the HTTP service.
   * @param {Writable} stdout The output stream to log to.
   * @param {Writable} stderr The error stream to log errors to.
   */
  public run(stdout: Writable, stderr: Writable): Promise<void> {
    return cluster.isPrimary ? this.runPrimary(stdout, stderr) : this.runWorker(stdout, stderr);
  }

  public async handleRequest(
    stdout: Writable,
    stderr: Writable,
    request: IncomingMessage,
    response: ServerResponse,
    engine: QueryEngineBase,
    mediaTypeFormats: Record<string, string>,
    mediaTypeWeights: Record<string, number>,
  ): Promise<void> {
    // Attempt to reconstruct the original full request URL with protocol and host
    const requestProtocol = <string> request.headers['x-forwarded-proto'] ?? 'http';
    const requestHost = <string> request.headers['x-forwarded-host'] ?? request.headers.host ?? 'localhost';
    const requestUrl = new URL(request.url ?? '/', `${requestProtocol}://${requestHost}`);

    // Headers that should always be sent and will not depend on the response
    response.setHeader('Access-Control-Allow-Origin', '*');

    try {
      // Requests should only be accepted at the specificed endpoint path
      if (requestUrl.pathname !== this.endpointPath) {
        throw new HTTPError(404, 'Not Found');
      }

      // Attempt to parse the request, and throw an error in case of failure
      const operation = await this.parseOperation(requestUrl, request);

      // Cache only needs to be invalidated when the worker is not fresh
      if (this.invalidateCacheBeforeQuery && !this.freshWorkerPerQuery) {
        await engine.invalidateHttpCache();
      }

      // Execute the query, or generate the service description
      const result: QueryType = operation.type === 'sd' ?
        this.getServiceDescription(requestUrl, mediaTypeFormats) :
        await engine.query(operation.queryString, operation.context);

      // TODO: Fix media type negotiation to avoid serialization errors here
      const mediaType = this.negotiateResultType(request, result, mediaTypeWeights);
      const { data } = await engine.resultToString(result, mediaType, this.context);

      // Everything is fine thus far, so assign the status code and set content-type header
      response.statusCode = 200;
      response.setHeader('Content-Type', mediaType);

      await new Promise<void>((resolve, reject) => {
        data.on('error', reject).on('end', resolve);
        data.pipe(response);
      });

      stdout.write(`Worker ${process.pid} resolved to ${result.resultType} as ${mediaType}\n`);
    } catch (error: unknown) {
      if (error instanceof HTTPError) {
        stderr.write(`Worker ${process.pid} failed with ${error.statusCode} ${error.message}\n`);
        response.statusCode = error.statusCode;
      } else {
        stderr.write(`Worker ${process.pid} encountered internal error\n`);
        stderr.write(inspect(error));
        response.statusCode = 500;
      }
    }

    if (!response.closed) {
      // When an error is thrown, the response needs to be closed separately here,
      // because the stream does not end on its own.
      response.end();
    }
  }

  /**
   * Resolve the media type for result serialization via content negotiation.
   *
   * Bundling all the media types for different data (quads, bindings, statistics) into the same list is broken,
   * and allows clients to request things like 'bindings serialized as application/n-quads', which then gets
   * accepted by the engine, but fails at the serialization step. This negotiation function therefore cannot know
   * if the serializers are able to handle the request.
   *
   * @param {IncomingMessage} request The incoming HTTP request.
   * @param {QueryType} result The outgoing result.
   * @param {Record<string, number>} mediaTypeWeights The supported media types and their weighs.
   * @returns {string | undefined} The negotiated media type, or undefined if negotiation failed.
   */
  public negotiateResultType(
    request: IncomingMessage,
    result: QueryType,
    mediaTypeWeights: Record<string, number>,
  ): string {
    // Convert the media type weights into format expected by the library
    const variants = Object.entries(mediaTypeWeights).map(([ type, q ]) => ({ type, q })).sort(t => t.q);

    // Attempt initial negotiation using the full pool of media types
    const negotiatedVariant: { type: string; qts: number } | undefined = negotiate.choose(variants, request)
      .sort((first: any, second: any) => second.qts - first.qts).at(0);

    // TODO: Split the media types into pools based on response.resultType and do content negotiation over the
    // appropriate pool only, then remove this code below, because it is a workaround to force default media types
    // unless the HTTP client explicitly requests a specific one. The client can still request an incompatible format,
    // but for cases like "Accept: */*" the code below will pick a media type that will work.
    if (negotiatedVariant && negotiatedVariant.qts > 2) {
      return negotiatedVariant.type;
    }

    switch (result.resultType) {
      case 'bindings':
        return 'application/sparql-results+json';
      case 'quads':
        return 'application/n-quads';
      default:
        return 'simple';
    }
  }

  /**
   * Extracts the SPARQL protocol operation from an incoming HTTP request.
   * @param {URL} url The parsed request URL.
   * @param {IncomingMessage} request The incoming HTTP request.
   * @returns {ISparqlOperation} The parsed SPARQL protocol operation.
   */
  public async parseOperation(url: URL, request: IncomingMessage): Promise<ISparqlOperation> {
    switch (request.method) {
      case 'GET':
      case 'HEAD':
      case 'OPTIONS':
        if (url.searchParams.has('query')) {
          return {
            type: 'query',
            queryString: url.searchParams.get('query')!,
            context: this.parseOperationParams(url.searchParams),
          };
        }
        if (url.searchParams.has('update')) {
          return {
            type: 'update',
            queryString: url.searchParams.get('update')!,
            context: this.parseOperationParams(url.searchParams),
          };
        }
        return {
          type: 'sd',
          queryString: '',
          context: this.parseOperationParams(url.searchParams),
        };
      case 'POST':
        // eslint-disable-next-line no-case-declarations
        const requestBody = await this.readRequestBody(request);
        if (requestBody.contentType.includes('application/sparql-query')) {
          return {
            type: 'query',
            queryString: requestBody.content,
            context: this.parseOperationParams(url.searchParams),
          };
        }
        if (requestBody.contentType.includes('application/sparql-update')) {
          return {
            type: 'update',
            queryString: requestBody.content,
            context: this.parseOperationParams(url.searchParams),
          };
        }
        if (requestBody.contentType.includes('application/x-www-form-urlencoded')) {
          const requestBodyParams = new URLSearchParams(requestBody.content);
          let requestBodyContext: QueryStringContext | undefined;
          if (requestBodyParams.has('context')) {
            try {
              requestBodyContext = JSON.parse(requestBodyParams.get('context')!);
            } catch {
              break;
            }
          }
          if (requestBodyParams.has('query')) {
            return {
              type: 'query',
              queryString: requestBodyParams.get('query')!,
              context: this.parseOperationParams(url.searchParams, requestBodyContext),
            };
          }
          if (requestBodyParams.has('update')) {
            return {
              type: 'update',
              queryString: requestBodyParams.get('update')!,
              context: this.parseOperationParams(url.searchParams, requestBodyContext),
            };
          }
        }
        break;
      default:
        throw new HTTPError(405, 'Method Not Allowed');
    }
    // If no parsed operation has been returned from any of the branches,
    // and the default switch block was not reached,
    // it means that no SPARQL operation has been parsed, and the request is invalid.
    throw new HTTPError(400, 'Bad Request');
  }

  /**
   * Reads the incoming HTTP request body into a string, using the Content-Encoding header.
   * @param {IncomingMessage} request The incoming client request.
   * @returns {IParsedRequestBody} The request body.
   */
  public async readRequestBody(request: IncomingMessage): Promise<IParsedRequestBody> {
    return new Promise((resolve, reject) => {
      if (!request.headers['content-type']) {
        throw new HTTPError(400, 'Bad Request');
      }
      const chunks: Uint8Array[] = [];
      const encoding = <BufferEncoding>request.headers['content-encoding'] ?? 'utf-8';
      request
        .on('data', (chunk: Uint8Array) => chunks.push(chunk))
        .on('error', reject)
        .on('close', reject)
        .on('end', () => resolve({
          content: Buffer.concat(chunks).toString(encoding),
          contentType: request.headers['content-type']!,
          contentEncoding: encoding,
        }));
    });
  }

  /**
   * Parses additional operation parameters from the URL search params into the context.
   * @param {URLSearchParams} params The URL search parameters from user.
   * @returns {QueryStringContext} The extended query string context.
   */
  public parseOperationParams(params: URLSearchParams, userContext?: QueryStringContext): QueryStringContext {
    const context: QueryStringContext = { ...this.context, ...this.allowContextOverride ? userContext : {}};
    if (params.has('default-graph-uri')) {
      context.defaultGraphUris = params.getAll('default-graph-uri').map(uri => DF.namedNode(uri));
    }
    if (params.has('named-graph-uri')) {
      context.namedGraphUris = params.getAll('named-graph-uri').map(uri => DF.namedNode(uri));
    }
    if (params.has('using-graph-uri')) {
      context.usingGraphUris = params.getAll('using-graph-uri').map(uri => DF.namedNode(uri));
    }
    if (params.has('using-named-graph-uri')) {
      context.usingNamedGraphUris = params.getAll('using-named-graph-uri').map(uri => DF.namedNode(uri));
    }
    return context;
  }

  /**
   * Gets the SPARQL service description as a quad result format for serialization.
   * @param {URL} serviceUri The URI at which this service is provided.
   * @param {Record<string, string>} mediaTypeFormats The supported result format URIs.
   * @returns {QueryQuads} The service description as query result quads.
   */
  public getServiceDescription(serviceUri: URL, mediaTypeFormats: Record<string, string>): IQueryQuadsEnhanced {
    const sd = 'http://www.w3.org/ns/sparql-service-description#';
    const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
    const endpoint = DF.namedNode(serviceUri.href);
    const quads = [
      // Basic metadata
      DF.quad(endpoint, DF.namedNode(`${rdf}type`), DF.namedNode(`${sd}Service`)),
      DF.quad(endpoint, DF.namedNode(`${sd}endpoint`), endpoint),
      DF.quad(endpoint, DF.namedNode(`${sd}url`), endpoint),
      // Features
      DF.quad(endpoint, DF.namedNode(`${sd}feature`), DF.namedNode(`${sd}BasicFederatedQuery`)),
      DF.quad(endpoint, DF.namedNode(`${sd}supportedLanguage`), DF.namedNode(`${sd}SPARQL10Query`)),
      DF.quad(endpoint, DF.namedNode(`${sd}supportedLanguage`), DF.namedNode(`${sd}SPARQL11Query`)),
      // Supported result formats
      ...Object.values(mediaTypeFormats).map(uri => DF.quad(endpoint, DF.namedNode(`${sd}resultFormat`), DF.namedNode(uri))),
    ];

    // Return the service description as a fake query result for serialization
    return { resultType: 'quads', execute: async() => new ArrayIterator(quads), metadata: <any>undefined };
  }

  /**
   * Starts the server
   * @param {string[]} argv The commandline arguments that the script was called with
   * @param {Writable} stdout The output stream to log to.
   * @param {Writable} stderr The error stream to log errors to.
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
    const options = await HttpServiceSparqlEndpoint.generateConstructorArguments(
      argv,
      moduleRootPath,
      env,
      defaultConfigPath,
      stderr,
      exit,
      cliArgsHandlers,
    );

    const service = new HttpServiceSparqlEndpoint(options);

    return new Promise<void>((resolve) => {
      service.run(stdout, stderr).then(resolve).catch((error) => {
        stderr.write(inspect(error));
        exit(1);
        resolve();
      });
    });
  }

  /**
   * Takes parsed commandline arguments and turns them into an object used in the HttpServiceSparqlEndpoint constructor
   * @param {string[]} argv The commandline arguments that the script was called with
   * @param {string} moduleRootPath The path to the invoking module.
   * @param {NodeJS.ProcessEnv} env The process env to get constants from.
   * @param {string} defaultConfigPath The path to get the config from if none is defined in the environment.
   * @param {Writable} stderr The error stream.
   * @param {Function} exit An exit process callback.
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
      return <any>exit(1);
    }

    // Invoke args handlers to process any remaining args
    const context: Record<string, any> = {};
    try {
      for (const cliArgsHandler of cliArgsHandlers) {
        await cliArgsHandler.handleArgs(args, context);
      }
    } catch (error: unknown) {
      stderr.write(`${(<Error>error).message}/n`);
      return <any>exit(1);
    }

    const invalidateCacheBeforeQuery: boolean = args.invalidateCache;
    const freshWorkerPerQuery: boolean = args.freshWorker;
    const allowContextOverride: boolean = args.allowContextOverride;
    const port = args.port;
    const timeout = args.timeout * 1_000;
    const workers = args.workers;
    context[KeysQueryOperation.readOnly.name] = !args.u;

    const configPath = env.COMUNICA_CONFIG ?? defaultConfigPath;

    return {
      defaultConfigPath,
      configPath,
      context,
      invalidateCacheBeforeQuery,
      freshWorkerPerQuery,
      allowContextOverride,
      moduleRootPath,
      mainModulePath: moduleRootPath,
      port,
      timeout,
      workers,
    };
  }

  /**
   * Start the HTTP service as master.
   * @param {Writable} stdout The output stream to log to.
   * @param {Writable} stderr The error stream to log errors to.
   */
  public async runPrimary(stdout: Writable, stderr: Writable): Promise<void> {
    stdout.write(`Starting SPARQL endpoint service with ${this.workers} workers at <http://localhost:${this.port}${this.endpointPath}>\n`);

    // The primary process is responsible for terminating workers when they reach their timeout
    const workerTimeouts = new Map<Worker, NodeJS.Timeout | undefined>();

    // Create workers
    for (let i = 0; i < this.workers; i++) {
      workerTimeouts.set(cluster.fork(), undefined);
    }

    // Attach listeners to each new worker
    cluster.on('listening', (worker: Worker) => {
      // Respawn crashed workers
      worker.once('exit', (code: number, signal: string) => {
        if (!worker.exitedAfterDisconnect) {
          if (code === 9 || signal === 'SIGKILL') {
            stderr.write(`Worker ${worker.process.pid} forcefully killed with exit code ${code} signal ${signal}, killing main process\n`);
            cluster.disconnect();
          } else {
            stderr.write(`Worker ${worker.process.pid} terminated with exit code ${code} signal ${signal}, starting a new one\n`);
            workerTimeouts.delete(worker);
            workerTimeouts.set(cluster.fork(), undefined);
          }
        }
      });
      worker.on('message', (message: string) => {
        switch (message) {
          case 'start':
            stdout.write(`Worker ${worker.process.pid} received a new request\n`);
            clearTimeout(workerTimeouts.get(worker));
            workerTimeouts.set(worker, setTimeout(() => {
              if (!worker.isDead()) {
                stdout.write(`Worker ${worker.process.pid} timed out, terminating\n`);
                worker.send('terminate');
              }
            }, this.timeout));
            break;
          case 'end':
            stdout.write(`Worker ${worker.process.pid} finished on time\n`);
            clearTimeout(workerTimeouts.get(worker));
            break;
          default:
            stdout.write(`Worker ${worker.process.pid} sent an unknown message: ${message}\n`);
            break;
        }
      });
    });

    // Disconnect from cluster on SIGINT, so that the process can cleanly terminate
    process.once('SIGINT', () => {
      stdout.write('Received SIGINT, terminating SPARQL endpoint\n');
      cluster.disconnect();
    });
  }

  /**
   * Start the HTTP service as worker.
   * @param {Writable} stdout The output stream to log to.
   * @param {Writable} stderr The error stream to log errors to.
   */
  public async runWorker(stdout: Writable, stderr: Writable): Promise<void> {
    // Create the engine for this worker
    const engine = await this.engineFactory.create();

    // Determine the supported media types (keys) for use in HTTP content negotiation
    // and their URIs (values) for use in SPARQL service description result format listing
    const mediaTypeWeights = await engine.getResultMediaTypes();
    const mediaTypeFormats = await engine.getResultMediaTypeFormats();

    // Keep track of all open responses, to be able to terminate then when the worker is terminated
    const openResponses = new Set<ServerResponse>();

    // Helper function to print errors into stderr
    const printError = (error: Error): boolean => stderr.write(inspect(error));

    // Handle termination of this worker
    const terminateWorker = async(code = 15): Promise<void> => {
      server.close();
      // Clear the responses set now, to avoid the response.on('close') handler triggering recursion
      const responses = [ ...openResponses.values() ];
      openResponses.clear();
      await Promise.all(responses.map(connection => new Promise<void>(resolve => connection.end(resolve))));
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(code);
    };

    // Create the server with the request handler function, that has to be synchronous
    const server = createServer((request: IncomingMessage, response: ServerResponse) => {
      openResponses.add(response);
      response.on('end', () => {
        // Inform the primary process that the worker has finished
        process.send!('end');
        // Remove the connection from the tracked open list, and kill the worker if we want fresh workers per query.
        // If the terminate function is called, in which case the worker has already been removed, then avoid recursion.
        if (openResponses.delete(response) && this.freshWorkerPerQuery && request.method !== 'HEAD') {
          terminateWorker().then().catch(printError);
        }
      });
      // Inform the primary process that the worker has received a request to handle
      process.send!('start');
      this.handleRequest(stdout, stderr, request, response, engine, mediaTypeFormats, mediaTypeWeights)
        .catch(printError);
    });

    // Subscribe to shutdown messages
    process.on('message', (message: string) => {
      switch (message) {
        case 'terminate':
          terminateWorker().catch(printError);
          break;
        default:
          stderr.write(`Unknown message received by worker ${process.pid}: ${message}\n`);
          break;
      }
    });

    // Catch global errors, and cleanly close open connections
    process.on('uncaughtException', (error: Error) => {
      stderr.write(inspect(error));
      terminateWorker().then().catch(printError);
    });

    // Start listening on the assigned port
    server.listen({ port: this.port }, () => {
      stdout.write(`Worker ${process.pid} listening for requests\n`);
    });
  }
}

export interface IHttpServiceSparqlEndpointArgs extends IDynamicQueryEngineOptions {
  context?: any;
  timeout?: number;
  port?: number;
  workers?: number;
  invalidateCacheBeforeQuery?: boolean;
  freshWorkerPerQuery?: boolean;
  allowContextOverride?: boolean;
  moduleRootPath: string;
  defaultConfigPath: string;
}

class HTTPError extends Error {
  public readonly statusCode: number;
  public constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

interface ISparqlOperation {
  type: 'query' | 'update' | 'sd';
  queryString: string;
  context: QueryStringContext;
}

interface IParsedRequestBody {
  content: string;
  contentType: string;
  contentEncoding: string;
}
