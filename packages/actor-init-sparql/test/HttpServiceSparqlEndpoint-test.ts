import {LoggerPretty} from "@comunica/logger-pretty";
import {WritableStream} from "memory-streams";
import minimist = require("minimist");
import * as querystring from "querystring";
import {PassThrough} from "stream";
import {fs, testArgumentDict, testFileContentDict} from "../__mocks__/fs";
import {http, ServerResponseMock} from "../__mocks__/http";
import {newEngineDynamic} from "../__mocks__/index";
import {parse} from "../__mocks__/url";
import {HttpServiceSparqlEndpoint} from "../lib/HttpServiceSparqlEndpoint";
import {ArrayIterator} from "asynciterator";
const stringToStream = require('streamify-string');
const quad = require('rdf-quad');

jest.mock('../index', () => {
  return {
    newEngineDynamic,
  };
});

jest.mock("url", () => {
  return {
    parse,
  };
});

jest.mock("http", () => {
  return http;
});

jest.mock("fs", () => {
  return fs;
});

describe('HttpServiceSparqlEndpoint', () => {
  describe('constructor', () => {
    it("shouldn't error if no args are supplied", () => {
      expect(() => new HttpServiceSparqlEndpoint()).not.toThrowError();
    });

    it("should set fields with values from args if present", () => {
      const args = {context: {test: "test"}, timeout: 4321, port: 24321, invalidateCacheBeforeQuery: true};
      const instance = new HttpServiceSparqlEndpoint(args);

      expect(instance.context).toEqual({test: "test"});
      expect(instance.timeout).toBe(4321);
      expect(instance.port).toBe(24321);
      expect(instance.invalidateCacheBeforeQuery).toBeTruthy();
    });

    it("should set default field values for fields that aren't in args", () => {
      const args = {};
      const instance = new HttpServiceSparqlEndpoint(args);

      expect(instance.context).toEqual({});
      expect(instance.timeout).toBe(60000);
      expect(instance.port).toBe(3000);
      expect(instance.invalidateCacheBeforeQuery).toBeFalsy();
    });
  });

  describe('runArgsInProcess', () => {
    const testCommandlineArgument = '{ "sources": [{ "type": "file", "value" : "http://localhost:8080/data.jsonld" }]}';
    let stdout;
    let stderr;
    const moduleRootPath = "test_modulerootpath";
    const env = {COMUNICA_CONFIG: "test_config"};
    const defaultConfigPath = "test_defaultConfigPath";
    const exit = jest.fn();
    beforeEach(() => {
      exit.mockClear();
      stdout = new WritableStream();
      stderr = new WritableStream();
    });

    it("Should exit on error", async () => {
      await HttpServiceSparqlEndpoint.runArgsInProcess([testCommandlineArgument],
          stdout, stderr, "rejecting_engine_promise", env, defaultConfigPath, exit);

      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr.toString()).toBe("REASON");
    });

    it("Should call .run on an HttpServiceSparqlEndpoint instance", async () => {
      await HttpServiceSparqlEndpoint.runArgsInProcess([testCommandlineArgument],
          stdout, stderr, moduleRootPath, env, defaultConfigPath, exit);

      expect(http.createServer).toBeCalled(); // Implicitly checking whether .run has been called
    });

    it("should not exit if exactly one argument is supplied and -h and --help are not set", () => {
      HttpServiceSparqlEndpoint.runArgsInProcess([testCommandlineArgument],
          stdout, stderr, moduleRootPath, env, defaultConfigPath, exit);

      expect(exit).not.toHaveBeenCalled();
    });

    it('should exit with help message if --help option is set', () => {
      HttpServiceSparqlEndpoint.runArgsInProcess([testCommandlineArgument, "--help"],
          stdout, stderr, moduleRootPath, env, defaultConfigPath, exit);

      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr.toString()).toBe(HttpServiceSparqlEndpoint.HELP_MESSAGE);
    });

    it('should exit with help message if -h option is set', () => {
      HttpServiceSparqlEndpoint.runArgsInProcess([testCommandlineArgument, "-h"],
          stdout, stderr, moduleRootPath, env, defaultConfigPath, exit);

      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr.toString()).toBe(HttpServiceSparqlEndpoint.HELP_MESSAGE);
    });

    it('should exit with help message if multiple arguments given', () => {
      HttpServiceSparqlEndpoint.runArgsInProcess([testCommandlineArgument, testCommandlineArgument],
          stdout, stderr, moduleRootPath, env, defaultConfigPath, exit);

      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr.toString()).toBe(HttpServiceSparqlEndpoint.HELP_MESSAGE);
    });

    it('should exit with help message if no arguments given', () => {
      HttpServiceSparqlEndpoint.runArgsInProcess([],
          stdout, stderr, moduleRootPath, env, defaultConfigPath, exit);

      expect(exit).toHaveBeenCalledWith(1);
      expect(stderr.toString()).toBe(HttpServiceSparqlEndpoint.HELP_MESSAGE);
    });
  });

  describe("generateConstructorArguments", () => {
    let testCommandlineArguments;
    const contextCommandlineArgument = JSON.stringify(testArgumentDict);
    const moduleRootPath = "test_modulerootpath";
    let env;
    const defaultConfigPath = "test_defaultConfigPath";
    beforeEach(() => {
      env = {COMUNICA_CONFIG: "test_config"};
      fs.existsSync.mockReturnValue(true);
      testCommandlineArguments = [contextCommandlineArgument];
    });

    it('should return an object containing the correct moduleRootPath configResourceUrl', () => {
      expect(HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath))
          .toMatchObject({configResourceUrl: env.COMUNICA_CONFIG, mainModulePath: moduleRootPath});
    });

    it('should use defaultConfigPath if env has no COMUNICA_CONFIG constant', () => {
      env = {};
      expect(HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath))
          .toMatchObject({configResourceUrl: defaultConfigPath, mainModulePath: moduleRootPath});
    });

    it('should use logger from given context if available', () => {
      fs.existsSync.mockReturnValue(false);
      const context = {...testArgumentDict, ...{log: new LoggerPretty({level: "test_loglevel"})}};

      const log = HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist([JSON.stringify(context)]), moduleRootPath, env, defaultConfigPath)
          .context.log;

      expect(log).toMatchObject({level: "test_loglevel"});
    });

    it('should use loglevel from commandline arguments if available', () => {
      testCommandlineArguments.push("-l", "test_loglevel");
      const log = HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath)
          .context.log;

      expect(log).toBeInstanceOf(LoggerPretty);
      expect(log.level).toBe('test_loglevel');
    });

    it('should set a logger with loglevel "warn" if none is defined in the given context', () => {
      const log = HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath)
          .context.log;

      expect(log).toBeInstanceOf(LoggerPretty);
      expect(log.level).toBe('warn');
    });

    it('should read timeout from the commandline options or use correct default', () => {
      expect(HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath)
          .timeout).toBe(60 * 1000);

      testCommandlineArguments.push("-t", 5);
      expect(HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath)
          .timeout).toBe(5 * 1000);
    });

    it('should read port from the commandline options or use correct default', () => {
      expect(HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath)
          .port).toBe(3000);

      testCommandlineArguments.push("-p", 4321);
      expect(HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath)
          .port).toBe(4321);
    });

    it("should read cache invalidation from the commandline options or use correct default", () => {
      expect(HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath)
          .invalidateCacheBeforeQuery).toBeFalsy();

      testCommandlineArguments.push("-i");
      expect(HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath)
          .invalidateCacheBeforeQuery).toBe(true);
    });

    it("should try to get context by parsing the commandline argument if it's not an existing file", () => {
      fs.existsSync.mockReturnValue(false);

      expect(HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath)
          .context).toMatchObject(testArgumentDict);
    });

    it('should read context from file if commandline argument is an existing file', () => {
      expect(HttpServiceSparqlEndpoint
          .generateConstructorArguments(minimist(testCommandlineArguments), moduleRootPath, env, defaultConfigPath)
          .context).toMatchObject(testFileContentDict);
    });
  });

  describe('An HttpServiceSparqlEndpoint instance', () => {
    let instance;
    beforeEach(() => {
      instance = new HttpServiceSparqlEndpoint({});
    });

    describe("run", () => {
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      beforeEach(() => {
        http.createServer.mockClear();
        instance.handleRequest.bind = jest.fn(() => "handleRequest_bound");
      });

      it("should set the server's timeout and port number correctly", async () => {
        const port = 201331;
        const timeout = 201331;
        instance.port = port;
        instance.timeout = timeout;
        await instance.run(stdout, stderr);

        const server = http.createServer.mock.results[0].value;
        expect(server.listen).toHaveBeenCalledWith(port);
        expect(server.setTimeout).toHaveBeenCalledWith(2 * timeout);
      });

      it("should call bind handleRequest with the correct arguments", async () => {
        // See mock implementation of getResultMediaTypes in ../index
        const variants = [ { type: 'mtype_1', quality: 1 },
                            { type: 'mtype_2', quality: 2 },
                            { type: 'mtype_3', quality: 3 },
                            { type: 'mtype_4', quality: 4 } ];
        await instance.run(stdout, stderr);

        expect(instance.handleRequest.bind).toBeCalledTimes(1);
        expect(instance.handleRequest.bind).toBeCalledWith(instance, await instance.engine, variants, stdout, stderr);
      });

      it("should call createServer with the correct arguments", async () => {
        await instance.run(stdout, stderr);

        expect(http.createServer).toBeCalledTimes(1);
        expect(http.createServer).toHaveBeenLastCalledWith(instance.handleRequest.bind());
      });
    });

    describe("handleRequest", () => {
      let engine;
      let variants;
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      let request;
      let response;
      beforeEach(async () => {
        instance.writeQueryResult = jest.fn();
        engine = await newEngineDynamic();
        variants = {type: "test_type", quality: 1};
        request = makeRequest();
        response = new ServerResponseMock();
      });

      function makeRequest() {
        request = stringToStream("default_test_request_content");
        request.url = "url_sparql";
        request.headers = {'content-type': "contenttypewhichdefinitelydoesnotexist", 'accept': "*/*"};
        return request;
      }

      it("should use the empty query string when the request method equals GET and url parsing fails"
          , async () => {
            request.method = "GET";
            request.url = "url_undefined_query";
            await instance.handleRequest(engine, variants, stdout, stderr, request, response);

            expect(instance.writeQueryResult).toHaveBeenCalledWith(engine, stdout, stderr,
                request, response, '', null, false);
          });

      it("should use the parsed query string when the request method equals GET"
          , async () => {
            request.method = "GET";
            await instance.handleRequest(engine, variants, stdout, stderr, request, response);

            expect(instance.writeQueryResult).toHaveBeenCalledWith(engine, stdout, stderr,
                request, response, 'test_query', null, false);
          });

      it("should set headonly and use the empty query string when the request method is HEAD and url parsing fails"
          , async () => {
            request.method = "HEAD";
            request.url = "url_undefined_query";
            await instance.handleRequest(engine, variants, stdout, stderr, request, response);

            expect(instance.writeQueryResult).toHaveBeenCalledWith(engine, stdout, stderr,
                request, response, '', null, true);
          });

      it("should set headonly and use the parsed query string when the request method is HEAD"
          , async () => {
            request.method = "HEAD";
            await instance.handleRequest(engine, variants, stdout, stderr, request, response);

            expect(instance.writeQueryResult).toHaveBeenCalledWith(engine, stdout, stderr,
                request, response, 'test_query', null, true);
          });

      it("should call writeQueryResult with correct arguments if request method equals POST", async () => {
        instance.parseBody = jest.fn(() => Promise.resolve("test_parseBody_result"));
        request.method = "POST";
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(instance.writeQueryResult).toHaveBeenCalledWith(engine, stdout, stderr,
            request, response, "test_parseBody_result", null, false);
      });

      it("should choose a mediaType if accept header is set", async () => {
        const chosen = "test_chosen_mediatype";
        const choose = jest.fn(() => [{type: chosen}]);
        jest.doMock("negotiate", () => {
          return {
            choose,
          };
        });
        request.headers = {accept: "mediaType"};

        instance.parseBody = jest.fn(() => Promise.resolve("test_parseBody_result"));
        request.method = "POST";
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(instance.writeQueryResult).toHaveBeenCalledWith(engine, stdout, stderr,
            request, response, "test_parseBody_result", chosen, false);
      });

      it("should only invalidate cache if invalidateCacheBeforeQuery is set to true", async () => {
        instance.invalidateCacheBeforeQuery = false;
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(engine.invalidateHttpCache).not.toHaveBeenCalled();
      });

      it("should invalidate cache if invalidateCacheBeforeQuery is set to true", async () => {
        instance.invalidateCacheBeforeQuery = true;
        await instance.handleRequest(engine, variants, stdout, stderr, request, response);

        expect(engine.invalidateHttpCache).toHaveBeenCalled();
      });

      it("should respond with 404 and end the response with the correct error message if path is incorrect"
          , async () => {
            request.url = "not_urlsparql";
            await instance.handleRequest(engine, variants, stdout, stderr, request, response);

            expect(response.writeHead).toHaveBeenCalledWith(404, { 'Access-Control-Allow-Origin': '*',
              'content-type': HttpServiceSparqlEndpoint.MIME_JSON});
            expect(response.end).toHaveBeenCalledWith(JSON.stringify({ message: 'Resource not found' }));
          });
    });

    describe("writeQueryResult", () => {
      let response;
      let request;
      let query;
      let mediaType;
      let endCalledPromise;
      beforeEach(() => {
        response = new ServerResponseMock();
        request = stringToStream("default_request_content");
        request.url = 'http://example.org/sparql';
        query = "default_test_query";
        mediaType = "default_test_mediatype";
        endCalledPromise = new Promise((resolve) => response.onEnd = resolve);
      });

      it('should end the response with error message content when the query rejects', async () => {
        query = "query_reject";
        await instance.writeQueryResult(await newEngineDynamic(), new PassThrough(), new PassThrough(),
            request, response, query, mediaType, false);

        await expect(endCalledPromise).resolves.toBe("Rejected query");
        expect(response.writeHead).toHaveBeenLastCalledWith(400,
            { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' });
      });

      it('should end the response with correct error message when the query cannot be serialized for given mediatype'
          , async () => {
            mediaType = "mediatype_throwerror";
            await instance.writeQueryResult(await newEngineDynamic(), new PassThrough(), new PassThrough(),
                request, response, query, mediaType, false);

            await expect(endCalledPromise).resolves.toBe(
                'The response for the given query could not be serialized for the requested media type\n');
            expect(response.writeHead).toHaveBeenLastCalledWith(400,
                { 'content-type': HttpServiceSparqlEndpoint.MIME_PLAIN, 'Access-Control-Allow-Origin': '*' });
          });

      it('should put the query result in the response if the query was successful', async () => {
        await instance.writeQueryResult(await newEngineDynamic(), new PassThrough(), new PassThrough(),
            request, response, query, mediaType, false);

        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
            {'content-type': mediaType, 'Access-Control-Allow-Origin': '*'});
        expect(response.toString()).toBe("test_query_result");
      });

      it('should end the response with an internal server error message when the queryresult stream emits an error'
          , async () => {
            mediaType = "mediatype_queryresultstreamerror";
            await instance.writeQueryResult(await newEngineDynamic(), new PassThrough(), new PassThrough(),
                request, response, query, mediaType, false);

            await expect(endCalledPromise).resolves.toBe("An internal server error occurred.\n");
            expect(response.writeHead).toHaveBeenCalledTimes(1);
            expect(response.writeHead).toHaveBeenLastCalledWith(200,
                {'content-type': mediaType, 'Access-Control-Allow-Origin': '*'});
          });

      it('should only write the head when headOnly is true', async () => {
        await instance.writeQueryResult(await newEngineDynamic(), new PassThrough(), new PassThrough(),
            request, response, query, mediaType, true);

        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
            {'content-type': mediaType, 'Access-Control-Allow-Origin': '*'});
        expect(response.end).toHaveBeenCalled();
        expect(response.toString()).toBe("");
      });

      it('should write the service description when no query was defined', async () => {
        // Create spies
        const engine = await newEngineDynamic();
        const spyWriteServiceDescription = jest.spyOn(instance, 'writeServiceDescription');
        const spyGetResultMediaTypeFormats = jest.spyOn(engine, 'getResultMediaTypeFormats');
        const spyResultToString = jest.spyOn(engine, 'resultToString');

        // Invoke writeQueryResult
        await instance.writeQueryResult(engine, new PassThrough(), new PassThrough(),
          request, response, '', mediaType, false);

        // Check output
        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          {'content-type': mediaType, 'Access-Control-Allow-Origin': '*'});
        expect(response.toString()).toBe("test_query_result");

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
            quad(s, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', sd + 'Service'),
            quad(s, sd + 'endpoint', '/sparql'),
            quad(s, sd + 'url', '/sparql'),
            quad(s, sd + 'feature', sd + 'BasicFederatedQuery'),
            quad(s, sd + 'supportedLanguage', sd + 'SPARQL10Query'),
            quad(s, sd + 'supportedLanguage', sd + 'SPARQL11Query'),
            quad(s, sd + 'resultFormat', 'ONE'),
            quad(s, sd + 'resultFormat', 'TWO'),
            quad(s, sd + 'resultFormat', 'THREE'),
            quad(s, sd + 'resultFormat', 'FOUR'),
          ]),
        });
      });

      it('should write the service description when no query was defined for HEAD', async () => {
        // Create spies
        const engine = await newEngineDynamic();
        const spyWriteServiceDescription = jest.spyOn(instance, 'writeServiceDescription');
        const spyGetResultMediaTypeFormats = jest.spyOn(engine, 'getResultMediaTypeFormats');
        const spyResultToString = jest.spyOn(engine, 'resultToString');

        // Invoke writeQueryResult
        await instance.writeQueryResult(engine, new PassThrough(), new PassThrough(),
          request, response, '', mediaType, true);

        // Check output
        await expect(endCalledPromise).resolves.toBeFalsy();
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          {'content-type': mediaType, 'Access-Control-Allow-Origin': '*'});
        expect(response.toString()).toBe("");

        // Check if the SD logic has been called
        expect(spyWriteServiceDescription).toHaveBeenCalledTimes(1);

        // Check if further processing is not done
        expect(spyGetResultMediaTypeFormats).toHaveBeenCalledTimes(0);
        expect(spyResultToString).toHaveBeenCalledTimes(0);
      });

      it('should handle errors in service description stringification', async () => {
        mediaType = "mediatype_queryresultstreamerror";
        await instance.writeQueryResult(await newEngineDynamic(), new PassThrough(), new PassThrough(),
          request, response, '', mediaType, false);

        await expect(endCalledPromise).resolves.toBe("An internal server error occurred.\n");
        expect(response.writeHead).toHaveBeenCalledTimes(1);
        expect(response.writeHead).toHaveBeenLastCalledWith(200,
          {'content-type': mediaType, 'Access-Control-Allow-Origin': '*'});
      });

      it('should handle an invalid media type in service description', async () => {
        mediaType = "mediatype_queryresultstreamerror";
        await instance.writeQueryResult(await newEngineDynamic(), new PassThrough(), new PassThrough(),
          request, response, '', 'mediatype_throwerror', false);

        await expect(endCalledPromise).resolves.toBe(
          "The response for the given query could not be serialized for the requested media type\n");
        expect(response.writeHead).toHaveBeenLastCalledWith(400,
          {'content-type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
      });
    });

    describe("stopResponse", () => {
      let response;
      let eventEmitter;
      const endListener = jest.fn();
      beforeEach(() => {
        endListener.mockClear();
        instance.timeout = 1500;
        response = new ServerResponseMock();
        eventEmitter = stringToStream("queryresult");
        eventEmitter.addListener("test", endListener);
      });

      it("should not error when eventEmitter is undefined", async () => {
        expect(() => instance.stopResponse(response, undefined)).not.toThrowError();
      });

      it('should do nothing when no timeout or close event occurs', async () => {
        instance.stopResponse(response, eventEmitter);
        // Not waiting for timeout to occur

        expect(eventEmitter.listeners("test").length).toEqual(1);
        expect(response.end).not.toHaveBeenCalled();
        expect(endListener).not.toHaveBeenCalled();
      });

      it('should remove event eventlisteners from eventEmitter if timeout occurs', async () => {
        instance.stopResponse(response, eventEmitter);
        await new Promise((resolve) => setTimeout(resolve, 1600)); // Wait for timeout to occur

        expect(eventEmitter.listeners("test").length).toEqual(0);
        expect(response.end).toHaveBeenCalled();
      });

      it('should remove event eventlisteners from eventEmitter when response is closed', async () => {
        instance.stopResponse(response, eventEmitter);
        response.emit("close");

        expect(eventEmitter.listeners("test").length).toEqual(0);
        expect(response.end).toHaveBeenCalled();
      });
    });

    describe('parseBody', () => {
      let httpRequestMock;
      const testRequestBody = "teststring";
      beforeEach(() => {
        httpRequestMock = stringToStream(testRequestBody);
        httpRequestMock.headers = {'content-type': "contenttypewhichdefinitelydoesnotexist"};
      });

      it('should reject if the stream emits an error', () => {
        httpRequestMock._read = () => httpRequestMock.emit('error', new Error('error'));
        return expect(instance.parseBody(httpRequestMock)).rejects.toBeTruthy();
      });

      it('should set encoding of the request to utf8', () => {
        httpRequestMock.setEncoding(null);
        instance.parseBody(httpRequestMock);
        return expect(httpRequestMock._readableState.encoding).toEqual('utf8');
      });

      // tslint:disable-next-line:max-line-length
      it('should return the empty string if the query is invalid and the content-type is application/x-www-form-urlencoded', () => {
        httpRequestMock.headers = {'content-type': "application/x-www-form-urlencoded"};
        return expect(instance.parseBody(httpRequestMock)).resolves.toBe('');
      });

      it('should parse query from url if the content-type is application/x-www-form-urlencoded', () => {
        const exampleQueryString = "query=SELECT%20*%20WHERE%20%7B%3Fs%20%3Fp%20%3Fo%7D";
        httpRequestMock = stringToStream(exampleQueryString);
        httpRequestMock.headers = {'content-type': "application/x-www-form-urlencoded"};

        return expect(instance.parseBody(httpRequestMock)).resolves.toBe(querystring.parse(exampleQueryString).query);
      });

      it('should return input body if content-type is not application/[sparql-query|x-www-form-urlencoded]', () => {
        return expect(instance.parseBody(httpRequestMock)).resolves.toBe(testRequestBody);
      });

      it('should return input body if content-type is application/sparql-query', () => {
        httpRequestMock.headers = {'content-type': "application/sparql-query"};
        return expect(instance.parseBody(httpRequestMock)).resolves.toBe(testRequestBody);
      });
    });
  });
});
