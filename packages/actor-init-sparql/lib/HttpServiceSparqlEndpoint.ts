import {LoggerPretty} from "@comunica/logger-pretty";
import * as fs from "fs";
import * as http from "http";
import EventEmitter = NodeJS.EventEmitter;
import minimist = require("minimist");
import * as querystring from "querystring";
import {Writable} from "stream";
import * as url from "url";
import {newEngineDynamic} from "../index";
import {ActorInitSparql} from "./ActorInitSparql";
import {IQueryOptions} from "./QueryDynamic";
import {ArrayIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {ActionContext} from "@comunica/core";
import {IActorQueryOperationOutput, IActorQueryOperationOutputQuads} from "@comunica/bus-query-operation";

// tslint:disable:no-var-requires
const quad = require('rdf-quad');

/**
 * An HTTP service that exposes a Comunica engine as a SPARQL endpoint.
 */
export class HttpServiceSparqlEndpoint {
  public static readonly MIME_PLAIN = 'text/plain';
  public static readonly MIME_JSON  = 'application/json';
  // tslint:disable:max-line-length
  public static readonly HELP_MESSAGE = `comunica-sparql-http exposes a Comunica engine as SPARQL endpoint

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
`;
  // tslint:enable:max-line-length
  public readonly engine: Promise<ActorInitSparql>;

  public readonly context: any;
  public readonly timeout: number;
  public readonly port: number;

  public readonly invalidateCacheBeforeQuery: boolean;

  constructor(args?: IHttpServiceSparqlEndpointArgs) {
    args = args || {};
    this.context = args.context || {};
    this.timeout = args.timeout || 60000;
    this.port = args.port || 3000;
    this.invalidateCacheBeforeQuery = !!args.invalidateCacheBeforeQuery;

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
   * @return {Promise<void>} A promise that resolves when the server has been started.
   */
  public static runArgsInProcess(argv: string[], stdout: Writable, stderr: Writable,
                                 moduleRootPath: string, env: NodeJS.ProcessEnv,
                                 defaultConfigPath: string, exit: (code: number) => void): Promise<void> {
    const args = minimist(argv);
    if (args._.length !== 1 || args.h || args.help) {
      stderr.write(HttpServiceSparqlEndpoint.HELP_MESSAGE);
      exit(1);
    }

    const options = HttpServiceSparqlEndpoint
        .generateConstructorArguments(args, moduleRootPath, env, defaultConfigPath);

    return new Promise<void>((resolve) => {
      new HttpServiceSparqlEndpoint(options).run(stdout, stderr)
          .then(resolve)
          .catch((reason) => {
            stderr.write(reason);
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
   */
  public static generateConstructorArguments(args: minimist.ParsedArgs, moduleRootPath: string,
                                             env: NodeJS.ProcessEnv, defaultConfigPath: string)
      : IHttpServiceSparqlEndpointArgs {
    // allow both files as direct JSON objects for context
    const context = JSON.parse(fs.existsSync(args._[0]) ? fs.readFileSync(args._[0], 'utf8') : args._[0]);
    const invalidateCacheBeforeQuery: boolean = args.i;
    const port = parseInt(args.p, 10) || 3000;
    const timeout = (parseInt(args.t, 10) || 60) * 1000;

    // Set the logger
    if (!context.log) {
      context.log = new LoggerPretty({ level: args.l || 'warn' });
    }

    const configResourceUrl = env.COMUNICA_CONFIG ? env.COMUNICA_CONFIG : defaultConfigPath;

    return {
      configResourceUrl,
      context,
      invalidateCacheBeforeQuery,
      mainModulePath: moduleRootPath,
      port,
      timeout,
    };
  }

  /**
   * Start the HTTP service.
   * @param {module:stream.internal.Writable} stdout The output stream to log to.
   * @param {module:stream.internal.Writable} stderr The error stream to log errors to.
   */
  public async run(stdout: Writable, stderr: Writable) {
    const engine: ActorInitSparql = await this.engine;

    // Determine the allowed media types for requests
    const mediaTypes: {[id: string]: number} = await engine.getResultMediaTypes();
    const variants: { type: string, quality: number }[] = [];
    for (const type of Object.keys(mediaTypes)) {
      variants.push({ type, quality: mediaTypes[type] });
    }

    // Start the server
    const server = http.createServer(this.handleRequest.bind(this, engine, variants, stdout, stderr));
    server.listen(this.port);
    server.setTimeout(2 * this.timeout); // unreliable mechanism, set too high on purpose
    stderr.write('Server running on http://localhost:' + this.port + '/sparql\n');
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
  public async handleRequest(engine: ActorInitSparql, variants: { type: string, quality: number }[],
                             stdout: Writable, stderr: Writable,
                             request: http.IncomingMessage, response: http.ServerResponse) {

    // Negotiate the best mediatype format
    let negotiation = undefined;
    let mediaType = null;

    try {
      negotiation = require('negotiate').choose(variants, request);
      const isValid = request.headers.accept && request.headers.accept !== '*/*' && negotiation;
      mediaType = isValid ? require('negotiate').choose(variants, request)[0].type : null;

      if (isValid && negotiation.length > 1) {
        let sameQualityList:string[] = [negotiation[0].type];
        let quality = negotiation[0].q;

        let i = 1;
        // Add all same quality negotiations from front of list 
        while (i < negotiation.length && negotiation[i].q === quality) {
          sameQualityList.push(negotiation[i].type);
          i++;
        }
        
        for (const variant of variants) {
          if (sameQualityList.includes(variant.type)) {
            mediaType = variant.type;
            break;
          }
        }
      }
    } catch (exception) {
      // Do nothing
    }


    // Verify the path
    const requestUrl = url.parse(request.url || '', true);
    if (requestUrl.pathname === '/' || request.url === "/") {
      stdout.write('[301] Permanently moved. Redirected to /sparql.');
      response.writeHead(301,
          { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON, 
          'Access-Control-Allow-Origin': '*' ,
          'Location': 'http://localhost:' + this.port + '/sparql'});
      response.end(JSON.stringify({ message: 'Queries are accepted on /sparql. Redirected.'}));
      return;
    } else if (requestUrl.pathname !== '/sparql') {
      stdout.write('[404] Resource not found. Queries are accepted on /sparql.\n');
      response.writeHead(404,
          { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON, 
          'Access-Control-Allow-Origin': '*'});
      response.end(JSON.stringify({ message: 'Resource not found. Queries are accepted on /sparql.'}));
      return;
    }

    if (this.invalidateCacheBeforeQuery) {
      // Invalidate cache
      await engine.invalidateHttpCache();
    }

    // Parse the query, depending on the HTTP method
    let sparql;
    switch (request.method) {
    case 'POST':
      sparql = await this.parseBody(request);
      this.writeQueryResult(engine, stdout, stderr, request, response, sparql, mediaType, false);
      break;
    case 'HEAD':
    case 'GET':
      sparql = <string> (<querystring.ParsedUrlQuery> requestUrl.query).query || '';
      this.writeQueryResult(engine, stdout, stderr, request, response, sparql, mediaType, request.method === 'HEAD');
      break;
    default:
      stdout.write('[405] ' + request.method + ' to ' + requestUrl + '\n');
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
   * @param {string} sparql The SPARQL query string.
   * @param {string} mediaType The requested response media type.
   * @param {boolean} headOnly If only the header should be written.
   */
  public async writeQueryResult(engine: ActorInitSparql, stdout: Writable, stderr: Writable,
                          request: http.IncomingMessage, response: http.ServerResponse,
                          sparql: string, mediaType: string, headOnly: boolean) {
    if (!sparql) {
      return this.writeServiceDescription(engine, stdout, stderr, request, response, mediaType, headOnly);
    }

    let result: IActorQueryOperationOutput;
    try {
      result = await engine.query(sparql, this.context);
    } catch (error) {
      stdout.write('[400] Bad request\n');
      response.writeHead(400,
        { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' });
      response.end(error.toString());
      return;
    }

    stdout.write('[200] ' + request.method + ' to ' + request.url + '\n');
    stdout.write('      Requested media type: ' + mediaType + '\n');
    stdout.write('      Received query: ' + sparql + '\n');
    response.writeHead(200, { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*'  });

    if (headOnly) {
      response.end();
      return;
    }

    let eventEmitter: EventEmitter | undefined;
    try {
      const data: NodeJS.ReadableStream = (await engine.resultToString(result, mediaType)).data;
      data.on('error', (e: Error) => {
        stdout.write('[500] Server error in results: ' + e + ' \n');
        response.end('An internal server error occurred.\n');
      });
      data.pipe(response);
      eventEmitter = data;
    } catch (error) {
      stdout.write('[400] Bad request, invalid media type\n');
      response.writeHead(400,
        { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' });
      response.end('The response for the given query could not be serialized for the requested media type\n');
    }

    this.stopResponse(response, eventEmitter);
  }

  public async writeServiceDescription(engine: ActorInitSparql, stdout: Writable, stderr: Writable,
                                 request: http.IncomingMessage, response: http.ServerResponse,
                                 mediaType: string, headOnly: boolean) {
    stdout.write('[200] ' + request.method + ' to ' + request.url + '\n');
    stdout.write('      Requested media type: ' + mediaType + '\n');
    stdout.write('      Received query for service description. ' + '\n');
    response.writeHead(200, { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*'  });

    if (headOnly) {
      response.end();
      return;
    }

    const s = request.url;
    const sd = 'http://www.w3.org/ns/sparql-service-description#';
    const quads: RDF.Quad[] = [
      // Basic metadata
      quad(s, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', sd + 'Service'),
      quad(s, sd + 'endpoint', '/sparql'),
      quad(s, sd + 'url', '/sparql'),

      // Features
      quad(s, sd + 'feature', sd + 'BasicFederatedQuery'),
      quad(s, sd + 'supportedLanguage', sd + 'SPARQL10Query'),
      quad(s, sd + 'supportedLanguage', sd + 'SPARQL11Query'),
    ];

    let eventEmitter: EventEmitter;
    try {
      // Append result formats
      const formats = await engine.getResultMediaTypeFormats(ActionContext(this.context));
      for (const m in formats) {
        quads.push(quad(s, sd + 'resultFormat', formats[m]));
      }

      // Flush results
      const data: NodeJS.ReadableStream = (await engine.resultToString(<IActorQueryOperationOutputQuads> {
        type: 'quads',
        quadStream: new ArrayIterator(quads),
      }, mediaType)).data;
      data.on('error', (e: Error) => {
        stdout.write('[500] Server error in results: ' + e + ' \n');
        response.end('An internal server error occurred.\n');
      });
      data.pipe(response);
      eventEmitter = data;
    } catch (error) {
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
  public stopResponse(response: http.ServerResponse, eventEmitter?: EventEmitter) {
    // Note: socket or response timeouts seemed unreliable, hence the explicit timeout
    const killTimeout = setTimeout(killClient, this.timeout);
    response.on('close', killClient);
    function killClient() {
      if (eventEmitter) {
        // remove all listeners so we are sure no more write calls are made
        eventEmitter.removeAllListeners();
        eventEmitter.emit('end');
      }
      try { response.end(); } catch (e) { /* ignore error */ }
      clearTimeout(killTimeout);
    }
  }

  /**
   * Parses the body of a SPARQL POST request
   * @param {module:http.IncomingMessage} request Request object.
   * @return {Promise<string>} A promise resolving to a query string.
   */
  public parseBody(request: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      request.setEncoding('utf8');
      request.on('error', reject);
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        const contentType: string | undefined = request.headers['content-type'];
        if (contentType && contentType.indexOf('application/sparql-query') >= 0) {
          return resolve(body);
        } else if (contentType && contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
          return resolve(<string> querystring.parse(body).query || '');
        } else {
          return resolve(body);
        }
      });
    });
  }
}

export interface IHttpServiceSparqlEndpointArgs extends IQueryOptions {
  context?: any;
  timeout?: number;
  port?: number;
  invalidateCacheBeforeQuery?: boolean;
}
