import type { Cluster } from 'node:cluster';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { Writable } from 'node:stream';
import type { QueryStringContext, QueryType } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { CliArgsHandlerBase } from '../lib/cli/CliArgsHandlerBase';
import { CliArgsHandlerHttp } from '../lib/cli/CliArgsHandlerHttp';
import { HttpServiceSparqlEndpoint } from '../lib/HttpServiceSparqlEndpoint';
import type { QueryEngineBase } from '../lib/QueryEngineBase';
import { QueryEngineFactoryBase } from '../lib/QueryEngineFactoryBase';

const cluster: Cluster = require('node:cluster');
const http = require('node:http');
const stringToStream = require('streamify-string');

const DF = new DataFactory();

const argsDefault = {
  moduleRootPath: 'moduleRootPath',
  defaultConfigPath: 'defaultConfigPath',
};

const mockYargs = {
  parse: jest.fn().mockRejectedValue(new Error('yargs.parse called')),
  getHelp: jest.fn().mockRejectedValue(new Error('yargs.getHelp called')),
};

jest.mock<any>('node:cluster', () => ({
  isPrimary: true,
  fork: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
}));

jest.mock<any>('yargs', () => ({
  default: () => mockYargs,
}));

describe('HttpServiceSparqlEndpoint', () => {
  let url: URL;
  let stdout: Writable;
  let stderr: Writable;
  let httpServiceSparqlEndpoint: HttpServiceSparqlEndpoint;

  beforeEach(() => {
    jest.resetAllMocks();
    url = new URL('http://localhost:3000/sparql');
    stdout = <any>{ write: jest.fn() };
    stderr = <any>{ write: jest.fn() };
    httpServiceSparqlEndpoint = new HttpServiceSparqlEndpoint(argsDefault);
    // Ensure the engine wrapper gets called
    (<any>httpServiceSparqlEndpoint).engineWrapper();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should not error if no args are supplied', () => {
      expect(() => new HttpServiceSparqlEndpoint({ ...argsDefault })).not.toThrow('TODO');
    });

    it('should set fields with values from args if present', () => {
      const args = { context: { test: 'test' }, timeout: 4_321, port: 24_321, invalidateCacheBeforeQuery: true };
      const instance = new HttpServiceSparqlEndpoint({ ...argsDefault, ...args });

      expect((<any>instance).context).toEqual({ test: 'test' });
      expect((<any>instance).timeout).toBe(4_321);
      expect((<any>instance).port).toBe(24_321);
      expect((<any>instance).invalidateCacheBeforeQuery).toBeTruthy();
    });

    it('should set default field values for fields that are not in args', () => {
      const args = { ...argsDefault };
      const instance = new HttpServiceSparqlEndpoint(args);

      expect((<any>instance).context).toEqual({});
      expect((<any>instance).timeout).toBe(60_000);
      expect((<any>instance).port).toBe(3_000);
      expect((<any>instance).invalidateCacheBeforeQuery).toBeFalsy();
    });
  });

  describe('run', () => {
    it('should call runPrimary if primary', async() => {
      jest.spyOn(httpServiceSparqlEndpoint, 'runPrimary').mockResolvedValue();
      jest.spyOn(httpServiceSparqlEndpoint, 'runWorker').mockResolvedValue();
      await httpServiceSparqlEndpoint.run(stdout, stderr);
      expect(httpServiceSparqlEndpoint.runPrimary).toHaveBeenCalledTimes(1);
      expect(httpServiceSparqlEndpoint.runWorker).not.toHaveBeenCalled();
    });

    it('should call runWorker if worker', async() => {
      jest.replaceProperty(cluster, 'isPrimary', false);
      jest.spyOn(httpServiceSparqlEndpoint, 'runPrimary').mockResolvedValue();
      jest.spyOn(httpServiceSparqlEndpoint, 'runWorker').mockResolvedValue();
      await httpServiceSparqlEndpoint.run(stdout, stderr);
      expect(httpServiceSparqlEndpoint.runPrimary).not.toHaveBeenCalled();
      expect(httpServiceSparqlEndpoint.runWorker).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleRequest', () => {
    it.each([ 'sd', 'query', 'update' ])('should handle %s request', async(type) => {
      const mediaType = 'mock media type';
      jest.spyOn(httpServiceSparqlEndpoint, 'parseOperation').mockResolvedValue({
        type: <any>type,
        context: <any>undefined,
        queryString: '',
      });
      jest.spyOn(httpServiceSparqlEndpoint, 'getServiceDescription').mockReturnValue({
        resultType: 'quads',
        execute: jest.fn(),
        metadata: jest.fn(),
      });
      jest.spyOn(httpServiceSparqlEndpoint, 'negotiateResultType').mockReturnValue(mediaType);
      const engine = {
        invalidateHttpCache: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue({
          resultType: type === 'query' ? 'bindings' : 'void',
          execute: jest.fn(),
          metadata: jest.fn(),
        }),
        resultToString: jest.fn().mockResolvedValue({ data: stringToStream('result as string') }),
      };
      // Ensure the invalidateHttpCache function is called
      (<any>httpServiceSparqlEndpoint).invalidateCacheBeforeQuery = true;
      (<any>httpServiceSparqlEndpoint).freshWorkerPerQuery = false;
      const request = { url, headers: {}};
      const response = {
        setHeader: jest.fn(),
        end: jest.fn(),
        statusCode: 0,
        on: jest.fn(),
        write: jest.fn(),
        once: jest.fn(),
        emit: jest.fn(),
      };
      const mediaTypeFormats = {};
      const mediaTypeWeights = {};
      await expect(httpServiceSparqlEndpoint.handleRequest(
        stdout,
        stderr,
        <any>request,
        <any>response,
        <any>engine,
        mediaTypeFormats,
        mediaTypeWeights,
      )).resolves.toBeUndefined();
      expect(stderr.write).not.toHaveBeenCalled();
      expect(response.statusCode).toBe(200);
      expect(engine.resultToString).toHaveBeenCalledTimes(1);
      expect(engine.resultToString).toHaveBeenNthCalledWith(1, {
        resultType: expect.any(String),
        execute: expect.any(Function),
        metadata: expect.any(Function),
      }, mediaType, {});
      expect(response.setHeader).toHaveBeenCalledTimes(2);
      expect(response.setHeader).toHaveBeenNthCalledWith(1, 'Access-Control-Allow-Origin', '*');
      expect(response.setHeader).toHaveBeenNthCalledWith(2, 'Content-Type', mediaType);
    });

    it('should reject paths that are not the endpoint', async() => {
      const response = { setHeader: jest.fn(), end: jest.fn(), statusCode: 0 };
      await expect(httpServiceSparqlEndpoint.handleRequest(
        stdout,
        stderr,
        <any>{ headers: {}},
        <any>response,
        <any>undefined,
        <any>undefined,
        <any>undefined,
      )).resolves.toBeUndefined();
      expect(stderr.write).toHaveBeenCalledTimes(1);
      expect(response.statusCode).toBe(404);
    });

    it('should report internal errors appropriately', async() => {
      const response = { setHeader: jest.fn(), end: jest.fn(), statusCode: 0 };
      jest.spyOn(httpServiceSparqlEndpoint, 'parseOperation').mockRejectedValue(new Error('Internal Error'));
      await expect(httpServiceSparqlEndpoint.handleRequest(
        stdout,
        stderr,
        <any>{ url, headers: {}},
        <any>response,
        <any>undefined,
        <any>undefined,
        <any>undefined,
      )).resolves.toBeUndefined();
      expect(stderr.write).toHaveBeenCalledTimes(2);
      expect(response.statusCode).toBe(500);
    });
  });

  describe('readRequestBody', () => {
    it('should successfully read request body', async() => {
      const content = 'abc';
      const contentEncoding = 'utf-8';
      const contentType = 'text/plain';
      const request: IncomingMessage = stringToStream(content);
      request.headers = { 'content-type': contentType, 'content-encoding': contentEncoding };
      const requestBody = await httpServiceSparqlEndpoint.readRequestBody(request);
      expect(requestBody.content).toBe(content);
      expect(requestBody.contentType).toBe(contentType);
      expect(requestBody.contentEncoding).toBe(contentEncoding);
    });

    it('should successfully read request body without content-encoding', async() => {
      const content = 'abc';
      const contentType = 'text/plain';
      const request: IncomingMessage = stringToStream(content);
      request.headers = { 'content-type': contentType };
      const requestBody = await httpServiceSparqlEndpoint.readRequestBody(request);
      expect(requestBody.content).toBe(content);
      expect(requestBody.contentType).toBe(contentType);
      expect(requestBody.contentEncoding).toBe('utf-8');
    });

    it('should reject request without content-type header', async() => {
      const content = 'abc';
      const request: IncomingMessage = stringToStream(content);
      request.headers = {};
      await expect(httpServiceSparqlEndpoint.readRequestBody(request)).rejects.toThrow('Bad Request');
    });

    it('should reject request with failing body stream', async() => {
      const content = 'abc';
      const request: IncomingMessage = stringToStream(content);
      const error = new Error('Body stream failing!');
      request._read = () => {
        throw error;
      };
      request.headers = { 'content-type': 'text/plain' };
      await expect(httpServiceSparqlEndpoint.readRequestBody(request)).rejects.toThrow(error);
    });
  });

  describe('parseOperation', () => {
    beforeEach(() => {
      jest.spyOn(httpServiceSparqlEndpoint, 'parseOperationParams').mockReturnValue(<any> undefined);
      jest.spyOn(httpServiceSparqlEndpoint, 'readRequestBody').mockImplementation(() => {
        throw new Error('readRequestBody');
      });
    });

    it.each([
      [ 'GET', 'query' ],
      [ 'GET', 'update' ],
      [ 'GET', 'sd' ],
      [ 'HEAD', 'query' ],
      [ 'HEAD', 'update' ],
      [ 'HEAD', 'sd' ],
      [ 'OPTIONS', 'query' ],
      [ 'OPTIONS', 'update' ],
      [ 'OPTIONS', 'sd' ],
    ])('should successfully parse %s request for %s', async(method, type) => {
      if (type !== 'sd') {
        url.searchParams.set(type, 'queryString');
      }
      await expect(httpServiceSparqlEndpoint.parseOperation(url, <IncomingMessage>{ method })).resolves.toStrictEqual({
        type,
        queryString: type === 'sd' ? '' : 'queryString',
        context: undefined,
      });
    });

    it.each([
      [ 'query', 'application/sparql-query', 'queryString' ],
      [ 'query', 'application/x-www-form-urlencoded', 'query=queryString' ],
      [ 'update', 'application/sparql-update', 'queryString' ],
      [ 'update', 'application/x-www-form-urlencoded', 'update=queryString' ],
    ])('should successfully parse POST request for %s as %s', async(type, contentType, content) => {
      jest.spyOn(httpServiceSparqlEndpoint, 'readRequestBody').mockResolvedValue({
        content,
        contentType,
        contentEncoding: 'utf-8',
      });
      await expect(httpServiceSparqlEndpoint.parseOperation(
        url,
        <IncomingMessage>{ method: 'POST' },
      )).resolves.toStrictEqual({
        type,
        queryString: 'queryString',
        context: undefined,
      });
    });

    it('should reject POST request with unsupported content type', async() => {
      jest.spyOn(httpServiceSparqlEndpoint, 'readRequestBody').mockResolvedValue({
        content: '',
        contentType: 'application/json',
        contentEncoding: 'utf-8',
      });
      await expect(httpServiceSparqlEndpoint.parseOperation(
        url,
        <IncomingMessage>{ method: 'POST' },
      )).rejects.toThrow('Bad Request');
    });

    it.each([
      'PUT',
      'DELETE',
      'CONNECT',
      'TRACE',
      'PATCH',
    ])('should reject %s as unsupported method', async(method) => {
      await expect(httpServiceSparqlEndpoint.parseOperation(
        url,
        <IncomingMessage>{ method },
      )).rejects.toThrow('Method Not Allowed');
    });

    it('should accept valid context in POST as application/x-www-form-urlencoded', async() => {
      const context = { key: 'value' };
      jest.spyOn(httpServiceSparqlEndpoint, 'parseOperationParams').mockImplementation(
        // Return the passed context to be able to compare it at the end
        (_, userContext: QueryStringContext | undefined) => userContext!,
      );
      jest.spyOn(httpServiceSparqlEndpoint, 'readRequestBody').mockResolvedValue({
        content: `query=queryString&context=${encodeURI(JSON.stringify(context))}`,
        contentType: 'application/x-www-form-urlencoded',
        contentEncoding: 'utf-8',
      });
      await expect(httpServiceSparqlEndpoint.parseOperation(
        url,
        <IncomingMessage>{ method: 'POST' },
      )).resolves.toStrictEqual({
        type: 'query',
        queryString: 'queryString',
        context,
      });
    });

    it('should reject invalid context in POST as application/x-www-form-urlencoded', async() => {
      jest.spyOn(httpServiceSparqlEndpoint, 'readRequestBody').mockResolvedValue({
        content: `query=queryString&context=${encodeURI('{ "key": "valueTYPO }')}`,
        contentType: 'application/x-www-form-urlencoded',
        contentEncoding: 'utf-8',
      });
      await expect(httpServiceSparqlEndpoint.parseOperation(
        url,
        <IncomingMessage>{ method: 'POST' },
      )).rejects.toThrow('Bad Request');
    });
  });

  describe('parseOperationParams', () => {
    it('should successfully parse all parameters', () => {
      const params = new URLSearchParams({
        'default-graph-uri': 'ex:g1',
        'named-graph-uri': 'ex:g2',
        'using-graph-uri': 'ex:g3',
        'using-named-graph-uri': 'ex:g4',
      });
      const parsed = httpServiceSparqlEndpoint.parseOperationParams(params);
      expect(parsed).toEqual({
        defaultGraphUris: [ DF.namedNode('ex:g1') ],
        namedGraphUris: [ DF.namedNode('ex:g2') ],
        usingGraphUris: [ DF.namedNode('ex:g3') ],
        usingNamedGraphUris: [ DF.namedNode('ex:g4') ],
      });
    });

    it('should successfully parse no parameters', () => {
      const params = new URLSearchParams();
      const parsed = httpServiceSparqlEndpoint.parseOperationParams(params);
      expect(parsed).toEqual({});
    });

    it('should successfully ignore user context', () => {
      const params = new URLSearchParams();
      const userContext: QueryStringContext = { sources: [{ value: 'ex:s' }], userKey: 'abc' };
      const parsed = httpServiceSparqlEndpoint.parseOperationParams(params, userContext);
      expect(parsed).toEqual({});
    });

    it('should successfully include user context', () => {
      httpServiceSparqlEndpoint = new HttpServiceSparqlEndpoint({ ...argsDefault, allowContextOverride: true });
      const params = new URLSearchParams();
      const userContext: QueryStringContext = { sources: [{ value: 'ex:s' }], userKey: 'abc' };
      const parsed = httpServiceSparqlEndpoint.parseOperationParams(params, userContext);
      expect(parsed).toEqual(userContext);
    });
  });

  describe('getServiceDescription', () => {
    it('should successfully output service description', async() => {
      const serviceUri = new URL('http://localhost:3000');
      const mediaTypeFormats = { 'text/plain': 'ex:textplain' };
      const sd = httpServiceSparqlEndpoint.getServiceDescription(serviceUri, mediaTypeFormats);
      expect(sd.metadata).toBeUndefined();
      expect(sd.resultType).toBe('quads');
      const quadsStream = await sd.execute();
      const quads: RDF.Quad[] = [];
      await new Promise((resolve, reject) => quadsStream
        .on('data', quad => quads.push(quad))
        .on('error', reject)
        .on('end', resolve));
      expect(quads).toHaveLength(7);
    });
  });

  describe('runArgsInProcess', () => {
    it('should execute successfully', async() => {
      jest.spyOn(HttpServiceSparqlEndpoint, 'generateConstructorArguments')
        .mockResolvedValue(<any>'constructorArguments');
      jest.spyOn(HttpServiceSparqlEndpoint.prototype, 'run').mockResolvedValue();
      const exit = jest.fn();
      await expect(HttpServiceSparqlEndpoint.runArgsInProcess(
        [],
        stdout,
        stderr,
        argsDefault.moduleRootPath,
        <any>{},
        argsDefault.defaultConfigPath,
        exit,
      )).resolves.toBeUndefined();
      expect(HttpServiceSparqlEndpoint.generateConstructorArguments).toHaveBeenCalledTimes(1);
      expect(HttpServiceSparqlEndpoint.prototype.run).toHaveBeenCalledTimes(1);
      expect(HttpServiceSparqlEndpoint.prototype.run).toHaveBeenNthCalledWith(1, stdout, stderr);
      expect(exit).not.toHaveBeenCalled();
    });

    it('should invoke exit upon failure', async() => {
      jest.spyOn(HttpServiceSparqlEndpoint, 'generateConstructorArguments')
        .mockResolvedValue(<any>'constructorArguments');
      const errorMessage = 'Error from .run function';
      const exit = jest.fn();
      jest.spyOn(HttpServiceSparqlEndpoint.prototype, 'run').mockRejectedValue(new Error(errorMessage));
      await expect(HttpServiceSparqlEndpoint.runArgsInProcess(
        [],
        stdout,
        stderr,
        argsDefault.moduleRootPath,
        <any>{},
        argsDefault.defaultConfigPath,
        exit,
      )).resolves.toBeUndefined();
      expect(HttpServiceSparqlEndpoint.generateConstructorArguments).toHaveBeenCalledTimes(1);
      expect(HttpServiceSparqlEndpoint.prototype.run).toHaveBeenCalledTimes(1);
      expect(HttpServiceSparqlEndpoint.prototype.run).toHaveBeenNthCalledWith(1, stdout, stderr);
      expect(exit).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenNthCalledWith(1, 1);
      expect(stderr.write).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    });
  });

  describe('generateConstructorArguments', () => {
    beforeEach(() => {
      jest.spyOn(CliArgsHandlerBase.prototype, 'handleArgs').mockResolvedValue(undefined);
      jest.spyOn(CliArgsHandlerHttp.prototype, 'handleArgs').mockResolvedValue(undefined);
      jest.spyOn(CliArgsHandlerBase.prototype, 'populateYargs').mockImplementation(
        (argumentsBuilder: any) => argumentsBuilder,
      );
      jest.spyOn(CliArgsHandlerHttp.prototype, 'populateYargs').mockImplementation(
        (argumentsBuilder: any) => argumentsBuilder,
      );
      jest.spyOn(mockYargs, 'parse').mockResolvedValue({});
      jest.spyOn(mockYargs, 'getHelp').mockResolvedValue('yargs help');
    });

    it('should run successfully', async() => {
      const exit = jest.fn();
      await expect(HttpServiceSparqlEndpoint.generateConstructorArguments(
        [],
        argsDefault.moduleRootPath,
        <any>{},
        argsDefault.defaultConfigPath,
        stderr,
        exit,
        [],
      )).resolves.toEqual(expect.objectContaining({
        configPath: argsDefault.defaultConfigPath,
        mainModulePath: argsDefault.moduleRootPath,
      }));
      expect(exit).not.toHaveBeenCalled();
      expect(stderr.write).not.toHaveBeenCalled();
      expect(mockYargs.parse).toHaveBeenCalledTimes(1);
      expect(mockYargs.getHelp).not.toHaveBeenCalled();
    });

    it('should prefer config path from environment', async() => {
      const exit = jest.fn();
      const COMUNICA_CONFIG = 'customConfigPathFromEnv';
      await expect(HttpServiceSparqlEndpoint.generateConstructorArguments(
        [],
        argsDefault.moduleRootPath,
        { COMUNICA_CONFIG },
        argsDefault.defaultConfigPath,
        stderr,
        exit,
        [],
      )).resolves.toEqual(expect.objectContaining({
        configPath: COMUNICA_CONFIG,
        mainModulePath: argsDefault.moduleRootPath,
      }));
      expect(exit).not.toHaveBeenCalled();
      expect(stderr.write).not.toHaveBeenCalled();
      expect(mockYargs.parse).toHaveBeenCalledTimes(1);
      expect(mockYargs.getHelp).not.toHaveBeenCalled();
    });

    it('should print help when yargs parsing fails', async() => {
      const exit = jest.fn();
      const errorMessage = 'Yargs parse error';
      jest.spyOn(mockYargs, 'parse').mockRejectedValue(new Error(errorMessage));
      await expect(HttpServiceSparqlEndpoint.generateConstructorArguments(
        [],
        argsDefault.moduleRootPath,
        <any>{},
        argsDefault.defaultConfigPath,
        stderr,
        exit,
        [],
      )).resolves.toBeUndefined();
      expect(exit).toHaveBeenCalledTimes(1);
      expect(stderr.write).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
      expect(mockYargs.parse).toHaveBeenCalledTimes(1);
      expect(mockYargs.getHelp).toHaveBeenCalledTimes(1);
      expect(stderr.write).toHaveBeenCalledWith(expect.stringContaining('yargs help'));
    });

    it('should exit when args handling fails', async() => {
      const exit = jest.fn();
      const errorMessage = 'CliArgsHandlerBase handleArgs error';
      jest.spyOn(CliArgsHandlerBase.prototype, 'handleArgs').mockRejectedValue(new Error(errorMessage));
      await expect(HttpServiceSparqlEndpoint.generateConstructorArguments(
        [],
        argsDefault.moduleRootPath,
        <any>{},
        argsDefault.defaultConfigPath,
        stderr,
        exit,
        [],
      )).resolves.toBeUndefined();
      expect(exit).toHaveBeenCalledTimes(1);
      expect(stderr.write).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
      expect(mockYargs.parse).toHaveBeenCalledTimes(1);
      expect(mockYargs.getHelp).not.toHaveBeenCalled();
    });
  });

  describe('runPrimary', () => {
    let worker: any;
    let handlers: Record<'message' | 'exit', (...args: any[]) => void>;

    beforeEach(() => {
      handlers = { message: jest.fn(), exit: jest.fn() };
      worker = {
        on: (event: 'message', listener: any) => handlers[event] = listener,
        once: (event: 'exit', listener: any) => handlers[event] = listener,
        send: jest.fn(),
        isDead: () => true,
        process: { pid: 123 },
        exitedAfterDisconnect: false,
      };
      jest.spyOn(cluster, 'disconnect').mockReturnValue(undefined);
      jest.spyOn(cluster, 'fork').mockReturnValue(worker);
      jest.spyOn(cluster, 'on').mockImplementation((_: string, listener: any) => listener(worker));
      jest.spyOn(globalThis, 'setTimeout').mockImplementation((handler: any) => handler());
    });

    it('should run successfully', async() => {
      expect(cluster.fork).not.toHaveBeenCalled();
      expect(stdout.write).not.toHaveBeenCalled();
      await expect(httpServiceSparqlEndpoint.runPrimary(stdout, stderr)).resolves.toBeUndefined();
      expect(cluster.fork).toHaveBeenCalledTimes(1);
      expect(stdout.write).toHaveBeenCalledTimes(1);
      expect(stdout.write).toHaveBeenNthCalledWith(1, expect.stringContaining('Starting SPARQL endpoint'));
      expect(() => handlers.message('start')).not.toThrow();
      expect(stdout.write).toHaveBeenCalledTimes(2);
      expect(stdout.write).toHaveBeenNthCalledWith(2, expect.stringContaining('Worker 123 received a new request'));
      expect(() => handlers.message('example')).not.toThrow();
      expect(stdout.write).toHaveBeenCalledTimes(3);
      expect(stdout.write).toHaveBeenNthCalledWith(3, 'Worker 123 sent an unknown message: example\n');
      expect(() => handlers.message('end')).not.toThrow();
      expect(stdout.write).toHaveBeenCalledTimes(4);
      expect(stdout.write).toHaveBeenNthCalledWith(4, expect.stringContaining('Worker 123 finished on time'));
      expect(() => handlers.exit(123456, undefined)).not.toThrow();
      expect(stderr.write).toHaveBeenCalledTimes(1);
      expect(stderr.write).toHaveBeenNthCalledWith(1, expect.stringContaining(
        'Worker 123 terminated with exit code 123456',
      ));
    });

    it('should disconnect if terminated prematurely', async() => {
      expect(cluster.disconnect).not.toHaveBeenCalled();
      await expect(httpServiceSparqlEndpoint.runPrimary(stdout, stderr)).resolves.toBeUndefined();
      expect(() => handlers.exit(9, undefined)).not.toThrow();
      expect(stderr.write).toHaveBeenCalledTimes(1);
      expect(stderr.write).toHaveBeenNthCalledWith(1, expect.stringContaining('Worker 123 forcefully killed'));
      expect(cluster.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should terminate workers that time out', async() => {
      worker.isDead = () => false;
      expect(worker.send).not.toHaveBeenCalled();
      await expect(httpServiceSparqlEndpoint.runPrimary(stdout, stderr)).resolves.toBeUndefined();
      expect(() => handlers.message('start')).not.toThrow();
      expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('Worker 123 timed out, terminating'));
      expect(worker.send).toHaveBeenCalledTimes(1);
      expect(worker.send).toHaveBeenNthCalledWith(1, 'terminate');
    });

    it('should handle SIGINT correctly', async() => {
      jest.spyOn(globalThis.process, 'once').mockImplementation(
        (event: string | symbol, listener: (...args: any[]) => any): any => {
          if (event === 'SIGINT') {
            listener();
          }
        },
      );
      expect(cluster.disconnect).not.toHaveBeenCalled();
      await expect(httpServiceSparqlEndpoint.runPrimary(stdout, stderr)).resolves.toBeUndefined();
      expect(cluster.disconnect).toHaveBeenCalledTimes(1);
      expect(stdout.write).toHaveBeenCalledWith('Received SIGINT, terminating SPARQL endpoint\n');
    });
  });

  describe('runWorker', () => {
    let mockEngine: QueryEngineBase;
    let mockServer: Server;
    let mockRequest: IncomingMessage;
    let mockResponse: ServerResponse;
    let mockRequestHandler: (request: IncomingMessage, response: ServerResponse) => void;

    beforeEach(() => {
      mockEngine = <any>{
        getResultMediaTypeFormats: jest.fn().mockResolvedValue({}),
        getResultMediaTypes: jest.fn().mockResolvedValue({}),
      };
      mockServer = <any>{
        listen: jest.fn().mockImplementation((_, callback) => callback()),
        close: jest.fn(),
      };
      mockRequest = <any>{};
      mockResponse = <any>{
        on: jest.fn().mockImplementation((event: string, handler: any) => {
          if (event === 'close') {
            mockResponse.end = handler;
          }
        }),
        end: jest.fn().mockImplementation((callback: any) => callback()),
      };
      jest.spyOn(http, 'createServer').mockImplementation((handler) => {
        mockRequestHandler = <any>handler;
        return mockServer;
      });
      (<any>httpServiceSparqlEndpoint).freshWorkerPerQuery = true;
      jest.spyOn(globalThis.process, 'send').mockReturnValue(true);
      jest.spyOn(globalThis.process, 'exit').mockImplementation(() => <never>undefined);
      jest.spyOn(QueryEngineFactoryBase.prototype, 'create').mockResolvedValue(mockEngine);
      jest.spyOn(httpServiceSparqlEndpoint, 'handleRequest').mockImplementation(
        async(_stdout, _stderr, _request, response, _engine, _mediaTypeFormats, _mediaTypeWeights) => {
          response.end();
        },
      );
    });

    it('should run successfully', async() => {
      expect(mockEngine.getResultMediaTypeFormats).not.toHaveBeenCalled();
      expect(mockEngine.getResultMediaTypes).not.toHaveBeenCalled();
      expect(mockServer.listen).not.toHaveBeenCalled();
      expect(http.createServer).not.toHaveBeenCalled();
      expect(stdout.write).not.toHaveBeenCalled();
      expect(globalThis.process.send).not.toHaveBeenCalled();
      await expect(httpServiceSparqlEndpoint.runWorker(stdout, stderr)).resolves.toBeUndefined();
      expect(() => mockRequestHandler(mockRequest, mockResponse)).not.toThrow();
      expect(httpServiceSparqlEndpoint.handleRequest).toHaveBeenCalledTimes(1);
      expect(stdout.write).toHaveBeenNthCalledWith(1, expect.stringContaining('listening for requests\n'));
      expect(http.createServer).toHaveBeenCalledTimes(1);
      expect(mockEngine.getResultMediaTypeFormats).toHaveBeenCalledTimes(1);
      expect(mockEngine.getResultMediaTypes).toHaveBeenCalledTimes(1);
      expect(mockServer.listen).toHaveBeenCalledTimes(1);
      expect(globalThis.process.send).toHaveBeenNthCalledWith(1, 'start');
      expect(globalThis.process.send).toHaveBeenNthCalledWith(2, 'end');
    });

    it('should handle errors in request processing', async() => {
      const errorMessage = 'Error from handleRequest';
      expect(stderr.write).not.toHaveBeenCalled();
      expect(globalThis.process.send).not.toHaveBeenCalled();
      jest.spyOn(httpServiceSparqlEndpoint, 'handleRequest').mockRejectedValue(new Error(errorMessage));
      await expect(httpServiceSparqlEndpoint.runWorker(stdout, stderr)).resolves.toBeUndefined();
      expect(() => mockRequestHandler(mockRequest, mockResponse)).not.toThrow();
      expect(globalThis.process.send).toHaveBeenNthCalledWith(1, 'start');
      expect(httpServiceSparqlEndpoint.handleRequest).toHaveBeenCalledTimes(1);
      // Ugly workaround to make sure the error handling for handleRequest has time to run
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(stderr.write).toHaveBeenNthCalledWith(1, expect.stringContaining(errorMessage));
    });

    it('should handle global errors', async() => {
      const errorMessage = 'Uncaught exception';
      let exceptionHandler: any;
      jest.spyOn(globalThis.process, 'on').mockImplementation(
        (event: string | symbol, listener: (...args: any[]) => void): any => {
          if (event === 'uncaughtException') {
            exceptionHandler = listener;
          }
        },
      );
      await expect(httpServiceSparqlEndpoint.runWorker(stdout, stderr)).resolves.toBeUndefined();
      expect(stderr.write).not.toHaveBeenCalled();
      expect(() => exceptionHandler(new Error(errorMessage))).not.toThrow();
      expect(stderr.write).toHaveBeenNthCalledWith(1, expect.stringContaining(errorMessage));
    });

    it('should handle terminate message', async() => {
      let messageHandler: any;
      jest.spyOn(globalThis.process, 'on').mockImplementation(
        (event: string | symbol, listener: (...args: any[]) => void): any => {
          if (event === 'message') {
            messageHandler = listener;
          }
        },
      );
      jest.spyOn(httpServiceSparqlEndpoint, 'handleRequest').mockResolvedValue();
      expect(mockServer.close).not.toHaveBeenCalled();
      await expect(httpServiceSparqlEndpoint.runWorker(stdout, stderr)).resolves.toBeUndefined();
      expect(() => mockRequestHandler(mockRequest, mockResponse)).not.toThrow();
      expect(mockServer.close).not.toHaveBeenCalled();
      expect(() => messageHandler('terminate')).not.toThrow();
      // Workaround so the promises running in .then().catch() have time to finish
      expect(process.send).toHaveBeenCalledTimes(2);
      expect(process.send).toHaveBeenNthCalledWith(1, 'start');
      expect(process.send).toHaveBeenNthCalledWith(2, 'end');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockServer.close).toHaveBeenCalledTimes(1);
    });

    it('should handle unknown messages', async() => {
      let messageHandler: any;
      jest.spyOn(globalThis.process, 'on').mockImplementation(
        (event: string | symbol, listener: (...args: any[]) => void): any => {
          if (event === 'message') {
            messageHandler = listener;
          }
        },
      );
      await expect(httpServiceSparqlEndpoint.runWorker(stdout, stderr)).resolves.toBeUndefined();
      expect(stderr.write).not.toHaveBeenCalled();
      expect(() => messageHandler('unknown message')).not.toThrow();
      expect(stderr.write).toHaveBeenNthCalledWith(1, expect.stringContaining('Unknown message received by worker'));
    });
  });

  describe('negotiateResultType', () => {
    it('should prefer user-requested format when available', () => {
      const request: IncomingMessage = stringToStream('abc');
      request.headers = { accept: 'text/turtle' };
      const result: QueryType = { resultType: 'quads', execute: <any> undefined, metadata: <any> undefined };
      const mediaTypeWeights = { 'text/turtle': 0.5, 'application/ld+json': 1 };
      const negotiatedMediaType = httpServiceSparqlEndpoint.negotiateResultType(request, result, mediaTypeWeights);
      expect(negotiatedMediaType).toBe('text/turtle');
    });

    it('should select application/sparql-results+json for bindings when no accept header is provided', () => {
      const request: IncomingMessage = stringToStream('abc');
      request.headers = {};
      const result: QueryType = { resultType: 'bindings', execute: <any> undefined, metadata: <any> undefined };
      const mediaTypeWeights = { 'text/turtle': 1 };
      const negotiatedMediaType = httpServiceSparqlEndpoint.negotiateResultType(request, result, mediaTypeWeights);
      expect(negotiatedMediaType).toBe('application/sparql-results+json');
    });

    it('should select application/n-quads for quads when no accept header is provided', () => {
      const request: IncomingMessage = stringToStream('abc');
      request.headers = {};
      const result: QueryType = { resultType: 'quads', execute: <any> undefined, metadata: <any> undefined };
      const mediaTypeWeights = { 'text/turtle': 1 };
      const negotiatedMediaType = httpServiceSparqlEndpoint.negotiateResultType(request, result, mediaTypeWeights);
      expect(negotiatedMediaType).toBe('application/n-quads');
    });

    it('should select simple for no output when no accept header is provided', () => {
      const request: IncomingMessage = stringToStream('abc');
      request.headers = {};
      const result: QueryType = { resultType: 'void', execute: <any> undefined };
      const mediaTypeWeights = { 'text/turtle': 1 };
      const negotiatedMediaType = httpServiceSparqlEndpoint.negotiateResultType(request, result, mediaTypeWeights);
      expect(negotiatedMediaType).toBe('simple');
    });
  });
});
