import * as cluster from 'cluster';
import * as EventEmitter from 'events';
import * as querystring from 'querystring';
import { PassThrough } from 'stream';
import { KeysQueryOperation } from '@comunica/context-entries';
import { LoggerPretty } from '@comunica/logger-pretty';
import { ArrayIterator } from 'asynciterator';
import { WritableStream } from 'memory-streams';
// @ts-expect-error
import { QueryEngineFactoryBase, QueryEngineBase } from '../__mocks__';
// @ts-expect-error
import { fs, testArgumentDict, testFileContentDict } from '../__mocks__/fs';
// @ts-expect-error
import { http, ServerResponseMock } from '../__mocks__/http';
// @ts-expect-error
import { parse } from '../__mocks__/url';
import { CliArgsHandlerBase } from '../lib/cli/CliArgsHandlerBase';
import type { IQueryBody } from '../lib/HttpServiceSparqlEndpoint';
import { HttpServiceSparqlEndpoint } from '../lib/HttpServiceSparqlEndpoint';
const quad = require('rdf-quad');
const stringToStream = require('streamify-string');

jest.mock('..', () => {
  return {
    QueryEngineBase,
    QueryEngineFactoryBase,
  };
});

jest.mock('url', () => {
  return {
    parse,
  };
});

jest.mock('http', () => {
  return http;
});

jest.mock('fs', () => {
  return fs;
});
jest.useFakeTimers('legacy');
// eslint-disable-next-line import/order
import { mocked } from 'ts-jest/utils';

const argsDefault = {
  moduleRootPath: 'moduleRootPath',
  defaultConfigPath: 'defaultConfigPath',
};

describe('HttpServiceSparqlEndpoint', () => {
  beforeEach(() => {
    process.exit = <any> jest.fn();

    // Assume worker thread in all tests by default
    (<any> cluster).isMaster = false;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('shouldn\'t error if no args are supplied', () => {
      expect(() => new HttpServiceSparqlEndpoint({ ...argsDefault })).not.toThrowError();
    });

    it('should set fields with values from args if present', () => {
      const args = { context: { test: 'test' }, timeout: 4_321, port: 24_321, invalidateCacheBeforeQuery: true };
      const instance = new HttpServiceSparqlEndpoint({ ...argsDefault, ...args });

      expect(instance.context).toEqual({ test: 'test' });
      expect(instance.timeout).toBe(4_321);
      expect(instance.port).toBe(24_321);
      expect(instance.invalidateCacheBeforeQuery).toBeTruthy();
    });

    it('should set default field values for fields that aren\'t in args', () => {
      const args = { ...argsDefault };
      const instance = new HttpServiceSparqlEndpoint(args);

      expect(instance.context).toEqual({});
      expect(instance.timeout).toBe(60_000);
      expect(instance.port).toBe(3_000);
      expect(instance.invalidateCacheBeforeQuery).toBeFalsy();
    });
  });

  describe('runArgsInProcess', () => {
    const source = 'http://localhost:8080/data.jsonld';
    const context =
      '{ "sources": [{ "type": "file", "value" : "http://localhost:8080/data.jsonld" }]}';
    let stdout: any;
    let stderr: any;
    const moduleRootPath = 'test_modulerootpath';
    const env = { COMUNICA_CONFIG: 'test_config' };
    const defaultConfigPath = 'test_defaultConfigPath';
    const exit = jest.fn();

    beforeEach(() => {
      exit.mockClear();
      stdout = new WritableStream();
      stderr = new WritableStream();
    });

    it('exits on error', async() => {
      await HttpServiceSparqlEndpoint.runArgsInProcess([ source ],
        stdout,
        stderr,
        'rejecting_engine_promise',
        env,
        defaultConfigPath,
        exit);

      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr.toString()).toBe('REASON');
    });

    it('handles valid args', async() => {
      await HttpServiceSparqlEndpoint.runArgsInProcess([ source ],
        stdout,
        stderr,
        moduleRootPath,
        env,
        defaultConfigPath,
        exit);

      expect(http.createServer).toBeCalled(); // Implicitly checking whether .run has been called
      expect(exit).not.toHaveBeenCalled();
    });

    it('handles the -c option', async() => {
      await HttpServiceSparqlEndpoint.runArgsInProcess([ '-c', context ],
        stdout,
        stderr,
        moduleRootPath,
        env,
        defaultConfigPath,
        exit);

      expect(http.createServer).toBeCalled(); // Implicitly checking whether .run has been called
    });

    it('handles the old contex passing form', async() => {
      await HttpServiceSparqlEndpoint.runArgsInProcess([ context ],
        stdout,
        stderr,
        moduleRootPath,
        env,
        defaultConfigPath,
        exit);

      expect(http.createServer).toBeCalled(); // Implicitly checking whether .run has been called
    });

    it('handles the --help option', async() => {
      await HttpServiceSparqlEndpoint.runArgsInProcess([ '--help' ],
        stdout,
        stderr,
        moduleRootPath,
        env,
        defaultConfigPath,
        exit);

      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr.toString()).toContain('exposes a SPARQL endpoint');
      expect(stderr.toString()).toContain('At least one source must be provided');
    });

    it('handles the -h option', async() => {
      await HttpServiceSparqlEndpoint.runArgsInProcess([ '-h' ],
        stdout,
        stderr,
        moduleRootPath,
        env,
        defaultConfigPath,
        exit);

      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr.toString()).toContain('exposes a SPARQL endpoint');
      expect(stderr.toString()).toContain('At least one source must be provided');
    });

    it('handles the --version option', async() => {
      await HttpServiceSparqlEndpoint.runArgsInProcess([ source, '--version' ],
        stdout,
        stderr,
        moduleRootPath,
        env,
        defaultConfigPath,
        exit);

      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr.toString()).toContain('Comunica Engine');
      expect(stderr.toString()).toContain('dev');
    });

    it('handles the -v option', async() => {
      jest.spyOn(CliArgsHandlerBase, 'isDevelopmentEnvironment').mockReturnValue(false);
      await HttpServiceSparqlEndpoint.runArgsInProcess([ source, '-v' ],
        stdout,
        stderr,
        moduleRootPath,
        env,
        defaultConfigPath,
        exit);

      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr.toString()).toContain('Comunica Engine');
      expect(stderr.toString()).not.toContain('dev');
    });

    it('handles no args', async() => {
      await HttpServiceSparqlEndpoint.runArgsInProcess([],
        stdout,
        stderr,
        moduleRootPath,
        env,
        defaultConfigPath,
        exit);

      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr.toString()).toContain('exposes a SPARQL endpoint');
      expect(stderr.toString()).toContain('At least one source must be provided');
    });
  });

  describe('generateConstructorArguments', () => {
    let testCommandlineArguments: any;
    const contextCommandlineArgument = JSON.stringify(testArgumentDict);
    const moduleRootPath = 'test_modulerootpath';
    let env: any;
    let stderr: any;
    const exit = jest.fn();
    const defaultConfigPath = 'test_defaultConfigPath';
    beforeEach(() => {
      env = { COMUNICA_CONFIG: 'test_config' };
      fs.existsSync.mockReturnValue(true);
      testCommandlineArguments = [ '-c', contextCommandlineArgument ];
      stderr = new WritableStream();
      exit.mockClear();
    });

    it('should return an object containing the correct moduleRootPath configPath', async() => {
      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          [])))
        .toMatchObject({ configPath: env.COMUNICA_CONFIG, mainModulePath: moduleRootPath });
    });

    it('should use defaultConfigPath if env has no COMUNICA_CONFIG constant', async() => {
      env = {};
      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          [])))
        .toMatchObject({ configPath: defaultConfigPath, mainModulePath: moduleRootPath });
    });

    it('should use logger from given context if available', async() => {
      fs.existsSync.mockReturnValue(false);
      const context = { ...testArgumentDict, log: new LoggerPretty({ level: 'test_loglevel' }) };

      const log = (await HttpServiceSparqlEndpoint
        .generateConstructorArguments([ '-c', JSON.stringify(context) ],
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          [])).context.log;

      expect(log).toMatchObject({ level: 'test_loglevel' });
    });

    it('should use loglevel from commandline arguments if available', async() => {
      testCommandlineArguments.push('-l', 'test_loglevel');
      const log = (await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .context.log;

      expect(log).toBeInstanceOf(LoggerPretty);
      expect(log.level).toBe('test_loglevel');
    });

    it('should set a logger with loglevel "warn" if none is defined in the given context', async() => {
      const log = (await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .context.log;

      expect(log).toBeInstanceOf(LoggerPretty);
      expect(log.level).toBe('warn');
    });

    it('should read timeout from the commandline options or use correct default', async() => {
      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .timeout).toBe(60 * 1_000);

      testCommandlineArguments.push('-t', 5);
      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .timeout).toBe(5 * 1_000);
    });

    it('should read port from the commandline options or use correct default', async() => {
      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .port).toBe(3_000);

      testCommandlineArguments.push('-p', 4_321);
      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .port).toBe(4_321);
    });

    it('should read cache invalidation from the commandline options or use correct default', async() => {
      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .invalidateCacheBeforeQuery).toBeFalsy();

      testCommandlineArguments.push('-i');
      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .invalidateCacheBeforeQuery).toBe(true);
    });

    it('should try to get context by parsing the commandline argument if it\'s not an existing file', async() => {
      fs.existsSync.mockReturnValue(false);

      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .context).toMatchObject(testArgumentDict);
    });

    it('should read context from file if commandline argument is an existing file', async() => {
      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .context).toMatchObject(testFileContentDict);
    });

    it('should read update flag from the commandline options or use correct default', async() => {
      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .context[KeysQueryOperation.readOnly.name]).toBe(true);

      testCommandlineArguments.push('-u');
      expect((await HttpServiceSparqlEndpoint
        .generateConstructorArguments(testCommandlineArguments,
          moduleRootPath,
          env,
          defaultConfigPath,
          stderr,
          exit,
          []))
        .context[KeysQueryOperation.readOnly.name]).toBe(false);
    });
  });

  describe('An HttpServiceSparqlEndpoint instance', () => {
    let instance: HttpServiceSparqlEndpoint;
    beforeEach(() => {
      instance = new HttpServiceSparqlEndpoint({ ...argsDefault, workers: 4 });
    });

    describe('run', () => {
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      beforeEach(() => {
        http.createServer.mockClear();
        (<any> instance.handleRequest).bind = jest.fn(() => 'handleRequest_bound');
      });

      it('should set the server\'s port number correctly', async() => {
        const port = 201_331;
        const timeout = 201_331;
        (<any> instance).port = port;
        (<any> instance).timeout = timeout;
        await instance.run(stdout, stderr);

        const server = http.createServer.mock.results[0].value;
        expect(server.listen).toHaveBeenCalledWith(port);
      });

      it('should call bind handleRequest with the correct arguments', async() => {
        // See mock implementation of getResultMediaTypes in ../index
        const variants = [{ type: 'mtype_1', quality: 1 },
          { type: 'mtype_2', quality: 2 },
          { type: 'mtype_3', quality: 3 },
          { type: 'mtype_4', quality: 4 }];
        await instance.run(stdout, stderr);

        expect(instance.handleRequest.bind).toBeCalledTimes(1);
        expect(instance.handleRequest.bind).toBeCalledWith(instance, await instance.engine, variants, stdout, stderr);
      });

      it('should call createServer with the correct arguments', async() => {
        await instance.run(stdout, stderr);

        expect(http.createServer).toBeCalledTimes(1);
        expect(http.createServer).toHaveBeenLastCalledWith((<any> instance).handleRequest.bind());
      });
    });

    describe('run as a master', () => {
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      beforeEach(() => {
        // Assume worker thread in all tests by default
        (<any> cluster).isMaster = true;
        (<any> cluster).fork = jest.fn();
        (<any> cluster).disconnect = jest.fn();
        (<any> cluster).on = jest.fn();
        (<any> process).once = jest.fn();
      });

      it('should invoke fork for each worker', async() => {
        await instance.run(stdout, stderr);

        expect(cluster.fork).toBeCalledTimes(4);
      });

      it('should handle worker exits', async() => {
        await instance.run(stdout, stderr);

        // Simulate listening event
        const dummyWorker = new EventEmitter();
        (<any> dummyWorker).process = {};
        (<any> mocked(cluster.on).mock.calls[0][1])(dummyWorker);

        // Simulate exit event
        dummyWorker.emit('exit');

        expect(cluster.fork).toBeCalledTimes(5);
      });

      it('should handle worker exits when exitedAfterDisconnect is true', async() => {
        await instance.run(stdout, stderr);

        // Simulate listening event
        const dummyWorker = new EventEmitter();
        (<any> dummyWorker).exitedAfterDisconnect = true;
        (<any> dummyWorker).process = {};
        (<any> mocked(cluster.on).mock.calls[0][1])(dummyWorker);

        // Simulate exit event
        dummyWorker.emit('exit');

        expect(cluster.fork).toBeCalledTimes(4);
      });

      it('should handle worker start messages', async() => {
        await instance.run(stdout, stderr);

        // Simulate listening event
        const dummyWorker: any = new EventEmitter();
        dummyWorker.send = jest.fn();
        dummyWorker.process = {
          pid: 123,
        };
        (<any> mocked(cluster.on).mock.calls[0][1])(dummyWorker);

        // Simulate start event
        dummyWorker.emit('message', 'start');

        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 60_000);
        expect(dummyWorker.send).not.toHaveBeenCalled();

        // Simulate timeout is passed
        jest.runAllTimers();

        expect(dummyWorker.send).toHaveBeenCalledWith('shutdown');
      });

      it('should handle worker end messages before timeout is reached', async() => {
        await instance.run(stdout, stderr);

        // Simulate listening event
        const dummyWorker: any = new EventEmitter();
        dummyWorker.send = jest.fn();
        dummyWorker.process = {
          pid: 123,
        };
        (<any> mocked(cluster.on).mock.calls[0][1])(dummyWorker);

        // Simulate start event
        dummyWorker.emit('message', 'start');

        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 60_000);
        expect(dummyWorker.send).not.toHaveBeenCalled();

        // Simulate end event
        dummyWorker.emit('message', 'end');

        expect(clearTimeout).toHaveBeenCalledTimes(1);

        expect(dummyWorker.send).not.toHaveBeenCalled();

        // Simulate timeout is passed
        jest.runAllTimers();

        expect(dummyWorker.send).not.toHaveBeenCalled();
      });

      it('should handle worker end messages after timeout is reached', async() => {
        await instance.run(stdout, stderr);

        // Simulate listening event
        const dummyWorker: any = new EventEmitter();
        dummyWorker.send = jest.fn();
        dummyWorker.process = {
          pid: 123,
        };
        (<any> mocked(cluster.on).mock.calls[0][1])(dummyWorker);

        // Simulate start event
        dummyWorker.emit('message', 'start');

        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 60_000);
        expect(dummyWorker.send).not.toHaveBeenCalled();

        // Simulate timeout is passed
        jest.runAllTimers();

        expect(dummyWorker.send).toHaveBeenCalledWith('shutdown');

        // Simulate end event
        dummyWorker.emit('message', 'end');

        expect(clearTimeout).not.toHaveBeenCalled();
      });

      it('should handle SIGINTs', async() => {
        await instance.run(stdout, stderr);

        // Simulate SIGINT event
        (<any> mocked(process.once).mock.calls[0][1])();

        expect(cluster.disconnect).toBeCalledTimes(1);
      });
    });

    describe('handleRequest', () => {
      let engine: any;
      let variants: any;
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      let request: any;
      let response: any;
      beforeEach(async() => {
        instance.writeQueryResult = jest.fn();
        engine = await new QueryEngineFactoryBase().create();
        variants = [{ type: 'test_type', quality: 1 }];
        request = makeRequest();
        response = new ServerResponseMock();
      });

      function makeRequest() {
        request = stringToStream('default_test_request_content');
        request.url = 'url_sparql';
        request.headers = { 'content-type': 'contenttypewhichdefinitelydoesnotexist', accept: '*/*' };
        return request;
      }

      it('should use the empty query string when the request method equals GET and url parsing fails'
        , async() => {
          request.method = 'GET';
          request.url = 'url_undefined_query';
          await instance.handleRequest(engine, variants, stdout, stderr, request, response);

          expect(instance.writeQueryResult)
            .toHaveBeenCalledWith(engine, stdout, stderr, request, response, undefined, null, false, true);
        });

      it('should use the parsed query string when the request method equals GET'
        , async() => {
          request.method = 'GET';
          await instance.handleRequest(engine, variants, stdout, stderr, request, response);

          expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
            stdout,
            stderr,
            request,
            response,
            { type: 'query', value: 'test_query' },
            null,
            false,
            true);
        });

      it('should set headonly and use the empty query string when the request method is HEAD and url parsing fails'
        , async() => {
          request.method = 'HEAD';
          request.url = 'url_undefined_query';
          await instance.handleRequest(engine, variants, stdout, stderr, request, response);

          expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
            stdout,
            stderr,
            request,
            response,
            undefined,
            null,
            true,
            true);
        });

      it('should set headonly and use the parsed query string when the request method is HEAD'
        , async() => {
          request.method = 'HEAD';
          await instance.handleRequest(engine, variants, stdout, stderr, request, response);

          expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
            stdout,
            stderr,
            request,
            response,
            { type: 'query', value: 'test_query' },
            null,
            true,
            true);
        });

      it('should call writeQueryResult with correct arguments if request method equals POST', async() => {
        (<any> instance).parseBody = jest.fn(() => Promise.resolve({ type: 'query', value: 'test_parseBody_result' }));
        request.method = 'POST';
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
          stdout,
          stderr,
          request,
          response,
          { type: 'query', value: 'test_parseBody_result' },
          null,
          false,
          false);
      });

      it('should choose a mediaType if accept header is set', async() => {
        const chosen = 'test_chosen_mediatype';
        variants = [{ type: chosen, quality: 1 }];
        request.headers = { accept: chosen };

        (<any> instance).parseBody = jest.fn(() => Promise.resolve({ type: 'query', value: 'test_parseBody_result' }));
        request.method = 'POST';
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
          stdout,
          stderr,
          request,
          response,
          { type: 'query', value: 'test_parseBody_result' },
          chosen,
          false,
          false);
      });

      it('should choose the best matching mediaType when we can exactly match', async() => {
        variants = [{ type: 'a/a', quality: 1 }, { type: 'b/b', quality: 0.9 }];
        request.headers = { accept: 'a/a,b/b' };

        (<any> instance).parseBody = jest.fn(() => Promise.resolve({ type: 'query', value: 'test_parseBody_result' }));
        request.method = 'POST';
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
          stdout,
          stderr,
          request,
          response,
          { type: 'query', value: 'test_parseBody_result' },
          'a/a',
          false,
          false);
      });

      it('should choose the best matching mediaType when we can exactly match with out-of-order q', async() => {
        variants = [{ type: 'b/b', quality: 0.9 }, { type: 'a/a', quality: 1 }];
        request.headers = { accept: 'a/a,b/b' };

        (<any> instance).parseBody = jest.fn(() => Promise.resolve({ type: 'query', value: 'test_parseBody_result' }));
        request.method = 'POST';
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
          stdout,
          stderr,
          request,
          response,
          { type: 'query', value: 'test_parseBody_result' },
          'a/a',
          false,
          false);
      });

      it('should choose the second best matching mediaType when we can exactly match', async() => {
        variants = [{ type: 'a/a', quality: 1 }, { type: 'b/b', quality: 0.9 }];
        request.headers = { accept: 'b/b' };

        (<any> instance).parseBody = jest.fn(() => Promise.resolve({ type: 'query', value: 'test_parseBody_result' }));
        request.method = 'POST';
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
          stdout,
          stderr,
          request,
          response,
          { type: 'query', value: 'test_parseBody_result' },
          'b/b',
          false,
          false);
      });

      it('should choose the mediaType when the first is unknown', async() => {
        variants = [{ type: 'a/a', quality: 1 }, { type: 'b/b', quality: 0.9 }];
        request.headers = { accept: 'x/x,a/a;q=0.8,b/b;q=0.9' };

        (<any> instance).parseBody = jest.fn(() => Promise.resolve({ type: 'query', value: 'test_parseBody_result' }));
        request.method = 'POST';
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
          stdout,
          stderr,
          request,
          response,
          { type: 'query', value: 'test_parseBody_result' },
          'b/b',
          false,
          false);
      });

      it('should choose a null media type if accept header is *', async() => {
        request.headers = { accept: '*' };

        (<any> instance).parseBody = jest.fn(() => Promise.resolve({ type: 'query', value: 'test_parseBody_result' }));
        request.method = 'POST';
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
          stdout,
          stderr,
          request,
          response,
          { type: 'query', value: 'test_parseBody_result' },
          null,
          false,
          false);
      });

      it('should choose a null media type if accept header is */*', async() => {
        request.headers = { accept: '*/*' };

        (<any> instance).parseBody = jest.fn(() => Promise.resolve({ type: 'query', value: 'test_parseBody_result' }));
        request.method = 'POST';
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
          stdout,
          stderr,
          request,
          response,
          { type: 'query', value: 'test_parseBody_result' },
          null,
          false,
          false);
      });

      it('should choose a null mediaType if accept header is not set', async() => {
        request.headers = {};

        (<any> instance).parseBody = jest.fn(() => Promise.resolve({ type: 'query', value: 'test_parseBody_result' }));
        request.method = 'POST';
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(instance.writeQueryResult).toHaveBeenCalledWith(engine,
          stdout,
          stderr,
          request,
          response,
          { type: 'query', value: 'test_parseBody_result' },
          null,
          false,
          false);
      });

      it('should only invalidate cache if invalidateCacheBeforeQuery is set to true', async() => {
        (<any> instance).invalidateCacheBeforeQuery = false;
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(engine.invalidateHttpCache).not.toHaveBeenCalled();
      });

      it('should invalidate cache if invalidateCacheBeforeQuery is set to true', async() => {
        (<any> instance).invalidateCacheBeforeQuery = true;
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(engine.invalidateHttpCache).toHaveBeenCalled();
      });

      it('should respond with 404 when not sparql url or root url'
        , async() => {
          request.url = 'not_urlsparql';
          await instance.handleRequest(engine, variants, stdout, stderr, request, response);

          expect(response.writeHead).toHaveBeenCalledWith(404, { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON,
            'Access-Control-Allow-Origin': '*' });
          expect(response.end)
            .toHaveBeenCalledWith(JSON.stringify({ message: 'Resource not found. Queries are accepted on /sparql.' }));
        });

      it('should respond with 404 when url undefined'
        , async() => {
          request.url = undefined;
          await instance.handleRequest(engine, variants, stdout, stderr, request, response);

          expect(response.writeHead).toHaveBeenCalledWith(404, { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON,
            'Access-Control-Allow-Origin': '*' });
          expect(response.end)
            .toHaveBeenCalledWith(JSON.stringify({ message: 'Resource not found. Queries are accepted on /sparql.' }));
        });

      it('should respond with 301 when GET method called on root url'
        , async() => {
          request.method = 'GET';
          request.url = '/';
          await instance.handleRequest(engine, variants, stdout, stderr, request, response);
          expect(response.writeHead).toHaveBeenCalledWith(301, { 'content-type': HttpServiceSparqlEndpoint.MIME_JSON,
            'Access-Control-Allow-Origin': '*',
            Location: 'http://localhost:3000/sparql' });
          expect(response.end)
            .toHaveBeenCalledWith(JSON.stringify({ message: 'Queries are accepted on /sparql. Redirected.' }));
        });
    });

    describe('writeQueryResult', () => {
      let response: any;
      let request: any;
      let query: IQueryBody;
      let mediaType: any;
      let endCalledPromise: any;
      beforeEach(() => {
        response = new ServerResponseMock();
        request = stringToStream('default_request_content');
        request.url = 'http://example.org/sparql';
        query = {
          type: 'query',
          value: 'default_test_query',
        };
        mediaType = 'default_test_mediatype';
        endCalledPromise = new Promise(resolve => response.onEnd = resolve);
      });

      it('should end the response with error message content when the query rejects', async() => {
        query = { type: 'query', value: 'query_reject' };
        await instance.writeQueryResult(await new QueryEngineFactoryBase().create(),
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          mediaType,
          false,
          true);

        await expect(endCalledPromise).resolves.toBe('Rejected query');
        expect(response.writeHead).toHaveBeenLastCalledWith(400,
          { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' });
      });

      it('should end the response with correct error message when the query cannot be serialized for given mediatype'
        , async() => {
          mediaType = 'mediatype_throwerror';
          await instance.writeQueryResult(await new QueryEngineFactoryBase().create(),
            new PassThrough(),
            new PassThrough(),
            request,
            response,
            query,
            mediaType,
            false,
            true);

          await expect(endCalledPromise).resolves.toBe(
            'The response for the given query could not be serialized for the requested media type\n',
          );
          expect(response.writeHead).toHaveBeenLastCalledWith(400,
            { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' });
        });

      it('should put the query result in the response if the query was successful', async() => {
        await instance.writeQueryResult(await new QueryEngineFactoryBase().create(),
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          mediaType,
          false,
          true);

        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });
        expect(response.toString()).toBe('test_query_result');
      });

      it('should end the response with an internal server error message when the queryresult stream emits an error'
        , async() => {
          mediaType = 'mediatype_queryresultstreamerror';
          await instance.writeQueryResult(await new QueryEngineFactoryBase().create(),
            new PassThrough(),
            new PassThrough(),
            request,
            response,
            query,
            mediaType,
            false,
            true);

          await expect(endCalledPromise).resolves.toBe('An internal server error occurred.\n');
          expect(response.writeHead).toHaveBeenCalledTimes(1);
          expect(response.writeHead).toHaveBeenLastCalledWith(200,
            { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });
        });

      it('should only write the head when headOnly is true', async() => {
        await instance.writeQueryResult(await new QueryEngineFactoryBase().create(),
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          mediaType,
          true,
          true);

        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });
        expect(response.end).toHaveBeenCalled();
        expect(response.toString()).toBe('');
      });

      it('should write the service description when no query was defined', async() => {
        // Create spies
        const engine = await new QueryEngineFactoryBase().create();
        const spyWriteServiceDescription = jest.spyOn(instance, 'writeServiceDescription');
        const spyGetResultMediaTypeFormats = jest.spyOn(engine, 'getResultMediaTypeFormats');
        const spyResultToString = jest.spyOn(engine, 'resultToString');

        // Invoke writeQueryResult
        await instance.writeQueryResult(engine,
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          { type: 'query', value: '' },
          mediaType,
          false,
          true);

        // Check output
        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });
        expect(response.toString()).toBe('test_query_result');

        // Check if the SD logic has been called
        expect(spyWriteServiceDescription).toHaveBeenCalledTimes(1);

        // Check if result media type formats have been retrieved
        expect(spyGetResultMediaTypeFormats).toHaveBeenCalledTimes(1);

        // Check if result to string has been called with the correct arguments
        expect(spyResultToString).toHaveBeenCalledTimes(1);
        expect(spyResultToString.mock.calls[0][1]).toEqual(mediaType);
        const s = 'http://example.org/sparql';
        const sd = 'http://www.w3.org/ns/sparql-service-description#';
        expect(spyResultToString.mock.calls[0][0]).toEqual({
          type: 'quads',
          quadStream: new ArrayIterator([
            quad(s, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', `${sd}Service`),
            quad(s, `${sd}endpoint`, '/sparql'),
            quad(s, `${sd}url`, '/sparql'),
            quad(s, `${sd}feature`, `${sd}BasicFederatedQuery`),
            quad(s, `${sd}supportedLanguage`, `${sd}SPARQL10Query`),
            quad(s, `${sd}supportedLanguage`, `${sd}SPARQL11Query`),
            quad(s, `${sd}resultFormat`, 'ONE'),
            quad(s, `${sd}resultFormat`, 'TWO'),
            quad(s, `${sd}resultFormat`, 'THREE'),
            quad(s, `${sd}resultFormat`, 'FOUR'),
          ]),
        });
      });

      it('should write the service description when no query was defined for HEAD', async() => {
        // Create spies
        const engine = await new QueryEngineFactoryBase().create();
        const spyWriteServiceDescription = jest.spyOn(instance, 'writeServiceDescription');
        const spyGetResultMediaTypeFormats = jest.spyOn(engine, 'getResultMediaTypeFormats');
        const spyResultToString = jest.spyOn(engine, 'resultToString');

        // Invoke writeQueryResult
        await instance.writeQueryResult(engine,
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          { type: 'query', value: '' },
          mediaType,
          true,
          true);

        // Check output
        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });
        expect(response.toString()).toBe('');

        // Check if the SD logic has been called
        expect(spyWriteServiceDescription).toHaveBeenCalledTimes(1);

        // Check if further processing is not done
        expect(spyGetResultMediaTypeFormats).toHaveBeenCalledTimes(0);
        expect(spyResultToString).toHaveBeenCalledTimes(0);
      });

      it('should handle errors in service description stringification', async() => {
        mediaType = 'mediatype_queryresultstreamerror';
        await instance.writeQueryResult(await new QueryEngineFactoryBase().create(),
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          { type: 'query', value: '' },
          mediaType,
          false,
          true);

        await expect(endCalledPromise).resolves.toBe('An internal server error occurred.\n');
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          { 'content-type': mediaType, 'Access-Control-Allow-Origin': '*' });
      });

      it('should handle an invalid media type in service description', async() => {
        mediaType = 'mediatype_queryresultstreamerror';
        await instance.writeQueryResult(await new QueryEngineFactoryBase().create(),
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          { type: 'query', value: '' },
          'mediatype_throwerror',
          false,
          true);

        await expect(endCalledPromise).resolves.toBe(
          'The response for the given query could not be serialized for the requested media type\n',
        );
        expect(response.writeHead).toHaveBeenLastCalledWith(400,
          { 'content-type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      });

      it('should fallback to SPARQL JSON for bindings if media type is falsy', async() => {
        const engine = await new QueryEngineFactoryBase().create();
        engine.query = () => ({ type: 'bindings' });

        await instance.writeQueryResult(engine,
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          '',
          false,
          true);

        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          { 'content-type': 'application/sparql-results+json', 'Access-Control-Allow-Origin': '*' });
        expect(response.toString()).toBe('test_query_result');
      });

      it('should fallback to SPARQL JSON for booleans if media type is falsy', async() => {
        const engine = await new QueryEngineFactoryBase().create();
        engine.query = () => ({ type: 'boolean' });

        await instance.writeQueryResult(engine,
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          '',
          false,
          true);

        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          { 'content-type': 'application/sparql-results+json', 'Access-Control-Allow-Origin': '*' });
        expect(response.toString()).toBe('test_query_result');
      });

      it('should fallback to TriG for quads if media type is falsy', async() => {
        const engine = await new QueryEngineFactoryBase().create();
        engine.query = () => ({ type: 'quads' });

        await instance.writeQueryResult(engine,
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          '',
          false,
          true);

        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          { 'content-type': 'application/trig', 'Access-Control-Allow-Origin': '*' });
        expect(response.toString()).toBe('test_query_result');
      });

      it('should emit process start and end events', async() => {
        process.send = jest.fn();
        const engine = await new QueryEngineFactoryBase().create();
        engine.query = () => ({ type: 'bindings' });

        await instance.writeQueryResult(engine,
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          '',
          false,
          true);

        expect(process.send).toHaveBeenCalledTimes(1);
        expect(process.send).toHaveBeenCalledWith('start');

        response.emit('close');
        expect(process.send).toHaveBeenCalledTimes(2);
        expect(process.send).toHaveBeenCalledWith('end');
      });

      it('should handle shutdown messages', async() => {
        let shutdownListener: any;
        (<any> process).on = (event: any, listener: any): void => {
          if (event === 'message') {
            shutdownListener = listener;
          }
        };
        const engine = await new QueryEngineFactoryBase().create();
        engine.query = () => ({ type: 'bindings' });

        await instance.writeQueryResult(engine,
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          '',
          false,
          true);

        expect(process.exit).not.toHaveBeenCalled();

        shutdownListener('shutdown');

        expect(process.exit).toHaveBeenCalledTimes(1);
        expect(response.end).toHaveBeenCalledWith('!TIMED OUT!');
      });

      it('should ignore non-shutdown messages', async() => {
        let shutdownListener: any;
        (<any> process).on = (event: any, listener: any): void => {
          if (event === 'message') {
            shutdownListener = listener;
          }
        };
        const engine = await new QueryEngineFactoryBase().create();
        engine.query = () => ({ type: 'bindings' });

        await instance.writeQueryResult(engine,
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          '',
          false,
          true);

        expect(process.exit).not.toHaveBeenCalled();

        shutdownListener('other');

        expect(process.exit).not.toHaveBeenCalled();
      });

      it('should fallback to simple for updates if media type is falsy', async() => {
        const engine = await new QueryEngineFactoryBase().create();
        engine.query = () => ({ type: 'update', updateResult: Promise.resolve() });

        await instance.writeQueryResult(engine,
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          '',
          false,
          true);

        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          { 'content-type': 'simple', 'Access-Control-Allow-Origin': '*' });
        expect(response.toString()).toBe('test_query_result');
      });

      it('should set readOnly in the context if called with readOnly true', async() => {
        const engine = await new QueryEngineFactoryBase().create();
        engine.query = jest.fn(() => ({ type: 'bindings' }));

        await instance.writeQueryResult(engine,
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          '',
          false,
          true);

        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(engine.query).toHaveBeenCalledWith('default_test_query', { [KeysQueryOperation.readOnly.name]: true });
      });

      it('should set not readOnly in the context if called with readOnly false', async() => {
        const engine = await new QueryEngineFactoryBase().create();
        engine.query = jest.fn(() => ({ type: 'bindings' }));

        await instance.writeQueryResult(engine,
          new PassThrough(),
          new PassThrough(),
          request,
          response,
          query,
          '',
          false,
          false);

        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(engine.query).toHaveBeenCalledWith('default_test_query', {});
      });
    });

    describe('stopResponse', () => {
      let response: any;
      let eventEmitter: any;
      const endListener = jest.fn();
      beforeEach(() => {
        endListener.mockClear();
        (<any> instance).timeout = 1_500;
        response = new ServerResponseMock();
        eventEmitter = stringToStream('queryresult');
        eventEmitter.addListener('test', endListener);
      });

      it('should not error when eventEmitter is undefined', async() => {
        instance.stopResponse(response);
        response.emit('close');
      });

      it('should do nothing when no timeout or close event occurs', async() => {
        instance.stopResponse(response, eventEmitter);
        // Not waiting for timeout to occur

        expect(eventEmitter.listeners('test').length).toEqual(1);
        expect(response.end).not.toHaveBeenCalled();
        expect(endListener).not.toHaveBeenCalled();
      });

      it('should remove event eventlisteners from eventEmitter when response is closed', async() => {
        instance.stopResponse(response, eventEmitter);
        response.emit('close');

        expect(eventEmitter.listeners('test').length).toEqual(0);
        expect(response.end).toHaveBeenCalled();
      });
    });

    describe('parseBody', () => {
      let httpRequestMock: any;
      const testRequestBody = 'teststring';
      beforeEach(() => {
        httpRequestMock = stringToStream(testRequestBody);
        httpRequestMock.headers = { 'content-type': 'contenttypewhichdefinitelydoesnotexist' };
      });

      it('should reject if the stream emits an error', () => {
        httpRequestMock._read = () => httpRequestMock.emit('error', new Error('error'));
        return expect(instance.parseBody(httpRequestMock)).rejects.toBeTruthy();
      });

      it('should set encoding of the request to utf8', () => {
        httpRequestMock.setEncoding(null);
        (<any> instance).parseBody(httpRequestMock)
          .catch((error: Error) => {
            // Ignore error
          });
        return expect(httpRequestMock._readableState.encoding).toEqual('utf8');
      });

      it('should reject without content-type', () => {
        httpRequestMock.headers = {};
        return expect(instance.parseBody(httpRequestMock)).rejects
          .toThrowError(`Invalid POST body received, query type could not be determined`);
      });

      it('should reject if the query is invalid and the content-type is application/x-www-form-urlencoded', () => {
        httpRequestMock.headers = { 'content-type': 'application/x-www-form-urlencoded' };
        return expect(instance.parseBody(httpRequestMock)).rejects
          .toThrowError(`Invalid POST body received, query type could not be determined`);
      });

      it('should parse query from url if the content-type is application/x-www-form-urlencoded', () => {
        const exampleQueryString = 'query=SELECT%20*%20WHERE%20%7B%3Fs%20%3Fp%20%3Fo%7D';
        httpRequestMock = stringToStream(exampleQueryString);
        httpRequestMock.headers = { 'content-type': 'application/x-www-form-urlencoded' };

        return expect(instance.parseBody(httpRequestMock)).resolves.toEqual({
          type: 'query',
          value: querystring.parse(exampleQueryString).query,
        });
      });

      it('should parse update from url if the content-type is application/x-www-form-urlencoded', () => {
        const exampleQueryString = 'update=INSERT%20*%20WHERE%20%7B%3Fs%20%3Fp%20%3Fo%7D';
        httpRequestMock = stringToStream(exampleQueryString);
        httpRequestMock.headers = { 'content-type': 'application/x-www-form-urlencoded' };

        return expect(instance.parseBody(httpRequestMock)).resolves.toEqual({
          type: 'update',
          value: querystring.parse(exampleQueryString).update,
        });
      });

      it('should reject if content-type is not application/[sparql-query|x-www-form-urlencoded]', () => {
        return expect(instance.parseBody(httpRequestMock)).rejects
          .toThrowError(`Invalid POST body received, query type could not be determined`);
      });

      it('should return input body if content-type is application/sparql-query', () => {
        httpRequestMock.headers = { 'content-type': 'application/sparql-query' };
        return expect(instance.parseBody(httpRequestMock)).resolves.toEqual({
          type: 'query',
          value: testRequestBody,
        });
      });

      it('should return input body if content-type is application/sparql-update', () => {
        httpRequestMock.headers = { 'content-type': 'application/sparql-update' };
        return expect(instance.parseBody(httpRequestMock)).resolves.toEqual({
          type: 'update',
          value: testRequestBody,
        });
      });
    });
  });
});
