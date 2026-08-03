import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import type { ActorHttpInvalidateListenable, IInvalidateListener } from '@comunica/bus-http-invalidate';
import { KeysHttp } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import CacheHandler from 'undici/types/cache-interceptor';
import { FetchInitPreprocessor } from '../lib/FetchInitPreprocessor';
import type { IFetchInitPreprocessor } from '../lib/IFetchInitPreprocessor';

import CacheStore = CacheHandler.CacheStore;

describe('FetchInitPreprocessor', () => {
  let httpInvalidator: ActorHttpInvalidateListenable;
  let httpInvalidatorListener: IInvalidateListener;
  let preprocessor: IFetchInitPreprocessor;
  let originalController: any;
  let defaultHeaders: Headers;
  let context: IActionContext;

  beforeEach(() => {
    httpInvalidator = <any>{
      addInvalidateListener: (listener: IInvalidateListener) => httpInvalidatorListener = listener,
    };
    preprocessor = new FetchInitPreprocessor({
      name: 'abc',
      bus: <any> undefined,
      cacheMaxSize: 104857600,
      cacheMaxCount: 1000,
      cacheMaxEntrySize: 5242880,
      agentOptions: {},
      httpInvalidator,
    });
    originalController = globalThis.AbortController;
    defaultHeaders = new Headers({ 'accept-encoding': 'br,gzip,deflate' });
    context = new ActionContext();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetAllMocks();
    globalThis.AbortController = originalController;
  });

  describe('handle', () => {
    it('should handle init without body', async() => {
      await expect(preprocessor.handle({}, context)).resolves.toStrictEqual({
        agent: expect.any(Function),
        dispatcher: undefined,
        headers: defaultHeaders,
        keepalive: true,
      });
    });

    it('should handle init with body', async() => {
      const body = new ReadableStream({
        async pull(controller) {
          controller.enqueue('abc');
          controller.close();
        },
      });
      await expect(preprocessor.handle({ body }, context)).resolves.toStrictEqual({
        agent: expect.any(Function),
        dispatcher: undefined,
        body: expect.any(ReadableStream),
        duplex: 'half',
        headers: defaultHeaders,
        keepalive: false,
      });
    });

    it('should not modify existing Accept-Encoding header', async() => {
      const customHeaders = new Headers({ 'accept-encoding': 'br' });
      await expect(preprocessor.handle({ headers: customHeaders }, context)).resolves.toStrictEqual({
        agent: expect.any(Function),
        dispatcher: undefined,
        headers: customHeaders,
        keepalive: true,
      });
    });

    it('should provide agents for http and https', async() => {
      expect((<any>preprocessor).agent(new URL('http://example.org/'))).toBeInstanceOf(HttpAgent);
      expect((<any>preprocessor).agent(new URL('https://example.org/'))).toBeInstanceOf(HttpsAgent);
    });

    it('should include a dispatcher when caching is enabled', async() => {
      await expect(preprocessor.handle({}, context.set(KeysHttp.httpCache, true))).resolves.toEqual({
        agent: expect.any(Function),
        dispatcher: expect.anything(),
        headers: defaultHeaders,
        keepalive: true,
      });
    });

    it('allows cache invalidation by URL', async() => {
      const cache = <CacheStore> (<any> preprocessor).cache;
      const ws = cache.createWriteStream(
        {
          origin: 'http://localhost:8080',
          path: '/a.html',
          method: 'GET',
        },
        {
          statusCode: 200,
          statusMessage: 'MSG',
          headers: {},
          cachedAt: 0,
          staleAt: 1000,
          deleteAt: 1000,
        },
      )!;
      ws.write('abc');
      ws.end();
      expect((<any> cache).size).toBe(3);
      httpInvalidatorListener({ url: 'http://otherhost:8080/a.html', context });
      expect((<any> cache).size).toBe(3);
      httpInvalidatorListener({ url: 'http://localhost:8080/a.html', context });
      expect((<any> cache).size).toBe(0);
    });

    it('allows full cache invalidation', async() => {
      const cache = <CacheStore> (<any> preprocessor).cache;
      const ws = cache.createWriteStream(
        {
          origin: 'http://localhost:8080',
          path: '/a.html',
          method: 'GET',
        },
        {
          statusCode: 200,
          statusMessage: 'MSG',
          headers: {},
          cachedAt: 0,
          staleAt: 1000,
          deleteAt: 1000,
        },
      )!;
      ws.write('abc');
      ws.end();
      expect((<any> cache).size).toBe(3);
      httpInvalidatorListener({ context });
      expect((<any> preprocessor).cache.size).toBe(0);
    });
  });
});
