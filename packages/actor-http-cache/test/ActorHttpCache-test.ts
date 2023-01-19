import { Readable } from 'stream';
import { ActorHttp } from '@comunica/bus-http';
import type { IActionHttp, MediatorHttp } from '@comunica/bus-http';
import type {
  ActorHttpInvalidateListenable,
  IActionHttpInvalidate,
  IActorHttpInvalidateOutput,
  IInvalidateListener,
  MediatorHttpInvalidate,
} from '@comunica/bus-http-invalidate';
import { KeysHttp, KeysHttpCache } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import { HttpCacheStorageLru } from '@comunica/http-cache-storage-lru';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';
import type { IHttpCacheStorage } from '@comunica/types';
import { ActorHttpCache } from '../lib/ActorHttpCache';
import { HttpCacheStorageStream } from '../lib/HttpCacheStorageStream';

/**
 * Helper
 */
// Define all the mock fetch request and responses here
const fetchOptionsData = {
  plain: <IFetchOptionData> {},
  maxAge: <IFetchOptionData> {
    responseInit: {
      headers: {
        'cache-control': 'max-age=604800',
      },
    },
  },
  eTag: <IFetchOptionData> {
    responseInit: {
      headers: {
        etag: '123456',
      },
    },
  },
  noStore: <IFetchOptionData> {
    responseInit: {
      headers: {
        'cache-control': 'no-store',
      },
    },
  },
};

interface IFetchOption {
  uri: string;
  request: Request;
  body: string;
  response: Response;
  responseInit: ResponseInit;
}

interface IFetchOptionData {
  requestInit?: RequestInit;
  responseInit?: ResponseInit;
}

type FetchOptions = {
  [key in keyof typeof fetchOptionsData]: IFetchOption;
};

function getHttpTestHelpers() {
  // @ts-expect-error
  const fo: FetchOptions = {};
  Object.entries(fetchOptionsData).forEach(([ key, fetchOptionData ]) => {
    const uri = `https://example.com/${key}`;
    fo[<keyof typeof fetchOptionsData> key] = <IFetchOption> {
      uri,
      request: new Request(uri, fetchOptionData.requestInit),
      body: key,
      response: new Response(key, fetchOptionData.responseInit),
      responseInit: fetchOptionData.responseInit,
    };
  });

  const fetch: jest.Mock<
  Promise<Response>,
  [input: RequestInfo, init?: RequestInit | undefined]
  > = jest.fn(
    async(input: RequestInfo, init?: RequestInit): Promise<Response> => {
      const fetchOption = Object.values(fo).find(
        option => option.uri === new Request(input, init).url,
      );
      if (!fetchOption) {
        throw new Error('Test specified unknown fetch option');
      }
      const bodyStream = Readable.from(Buffer.from(fetchOption.body));
      // @ts-expect-error
      const response = new Response(bodyStream, fetchOption.responseInit);
      ActorHttp.normalizeResponseBody(response.body);
      return response;
    },
  );

  return { fo, fetch };
}

/**
 * Tests
 */

describe('ActorHttpCache', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorHttpCache instance', () => {
    let actor: ActorHttpCache;
    let fetch: jest.Mock<
    Promise<Response>,
    [input: RequestInfo, init?: RequestInit | undefined]
    >;
    let fo: FetchOptions;
    let mediatorHttpInvalidate: MediatorHttpInvalidate;
    let httpInvalidator: ActorHttpInvalidateListenable;
    let context: ActionContext;
    let mediatorHttp: MediatorHttp;
    let cacheStorageStream: HttpCacheStorageStream;

    beforeEach(() => {
      const helpers = getHttpTestHelpers();
      fetch = helpers.fetch;
      fo = helpers.fo;
      // @ts-expect-error
      mediatorHttpInvalidate = {
        mediate: jest.fn(async(action: IActionHttpInvalidate): Promise<IActorHttpInvalidateOutput> => ({})),
      };
      // @ts-expect-error
      httpInvalidator = {
        addInvalidateListener: jest.fn(),
      };
      context = new ActionContext({});
      // @ts-expect-error
      mediatorHttp = {
        // @ts-expect-error
        mediateActor: jest.fn(async(action: IActionHttp): Promise<ActorHttp> => ({
          test: jest.fn(
            async(action2: IActionHttp): Promise<IMediatorTypeTime> => ({ time: Number.POSITIVE_INFINITY }),
          ),
        })),
        mediate: jest.fn(async(action: IActionHttp): Promise<Response> => {
          return fetch(action.input, action.init);
        }),
      };

      cacheStorageStream = new HttpCacheStorageStream({
        bufferCache: new HttpCacheStorageLru({ max: 10, mediatorHttpInvalidate }),
        mediatorHttpInvalidate,
        maxBufferSize: 10_000,
      });

      actor = new ActorHttpCache({
        name: 'actor',
        bus,
        cacheStorage: cacheStorageStream,
        mediatorHttpInvalidate,
        httpInvalidator,
        mediatorHttp,
      });
    });

    it('has a test return infinity if the request is not in the chache', async() => {
      expect(
        await actor.test({ input: fo.plain.uri, context: new ActionContext({}) }),
      ).toEqual({ time: Number.POSITIVE_INFINITY });
    });

    it('throws an error if tested with context.doNotCheckHttpCache = true', async() => {
      await expect(
        actor.test({
          input: fo.plain.uri,
          context: context.set(KeysHttpCache.doNotCheckHttpCache, true),
        }),
      ).rejects.toThrowError();
    });

    it('fetches the document and caches it', async() => {
      const result1 = await actor.run({
        input: fo.maxAge.uri,
        context: new ActionContext({ [KeysHttp.fetch.name]: fetch }),
      });
      expect(await result1.text()).toBe(fo.maxAge.body);
      const result2 = await actor.run({ input: fo.maxAge.uri, context: new ActionContext({}) });
      expect(await result2.text()).toBe(fo.maxAge.body);
    });

    it('has an item return infinity even if an item is in the cache', async() => {
      await actor.run({
        input: fo.maxAge.uri,
        context: new ActionContext({ [KeysHttp.fetch.name]: fetch }),
      });
      expect(await actor.test({
        input: fo.maxAge.uri,
        context: new ActionContext({ [KeysHttp.fetch.name]: fetch }),
      })).toEqual({ time: Number.POSITIVE_INFINITY });
    });

    describe('invalidate cache', () => {
      let cacheStorage: IHttpCacheStorage<ReadableStream<Uint8Array>>;

      beforeEach(() => {
        // @ts-expect-error
        cacheStorage = {
          delete: jest.fn(),
          clear: jest.fn(),
        };
      });

      it('invalidates the cache with a url', () => {
        // @ts-expect-error
        httpInvalidator = {
          addInvalidateListener: jest.fn((listener: IInvalidateListener) => {
            listener({ url: fo.plain.uri, context });
          }),
        };
        new ActorHttpCache({
          name: 'actor',
          bus,
          cacheStorage,
          mediatorHttpInvalidate,
          httpInvalidator,
          mediatorHttp,
        });
        expect(cacheStorage.delete).toHaveBeenCalledWith(new Request(fo.plain.uri));
      });

      it('invalidates the cache without a url', () => {
        // @ts-expect-error
        httpInvalidator = {
          addInvalidateListener: jest.fn((listener: IInvalidateListener) => {
            listener({ context });
          }),
        };
        new ActorHttpCache({
          name: 'actor',
          bus,
          cacheStorage,
          mediatorHttpInvalidate,
          httpInvalidator,
          mediatorHttp,
        });
        expect(cacheStorage.clear).toHaveBeenCalled();
      });
    });

    describe('fetchWithCache', () => {
      it('performs a fetch when there is nothing in the cache.', async() => {
        const input = { input: fo.maxAge.request, context };
        await actor.run(input);
        expect(mediatorHttp.mediate).toHaveBeenCalledWith({
          ...input,
          context: input.context.set(KeysHttpCache.doNotCheckHttpCache, true),
        });
        expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
      });

      it('does not perform a fetch when the cache is not stale', async() => {
        const input1 = { input: fo.maxAge.request, context };
        const matchResult1 = await actor.run(input1);
        expect(await matchResult1?.text()).toBe(fo.maxAge.body);
        const input2 = { input: fo.maxAge.request, context };
        const matchResult2 = await actor.run(input2);
        expect(mediatorHttp.mediate).toHaveBeenCalledWith({
          ...input2,
          context: input2.context.set(KeysHttpCache.doNotCheckHttpCache, true),
        });
        expect(mediatorHttp.mediate).toHaveBeenCalledTimes(1);
        expect(await matchResult2?.text()).toBe(fo.maxAge.body);
      });

      it('performs a fetch when the cache is stale', async() => {
        const input = { input: fo.plain.request, context };
        await actor.run(input);
        await actor.run(input);
        expect(mediatorHttp.mediate).toHaveBeenCalledWith({
          ...input,
          context: input.context.set(KeysHttpCache.doNotCheckHttpCache, true),
        });
        expect(mediatorHttp.mediate).toHaveBeenCalledTimes(2);
        expect(mediatorHttpInvalidate.mediate).toHaveBeenCalledWith({ url: fo.plain.uri, context });
      });

      it('makes a request with the proper headers when an etag is present', async() => {
        const input1 = { input: fo.eTag.request, context };
        const matchResult1 = await actor.run(input1);
        expect(mediatorHttp.mediate).toHaveBeenCalledWith({
          ...input1,
          context: input1.context.set(KeysHttpCache.doNotCheckHttpCache, true),
        });
        expect(await matchResult1?.text()).toBe(fo.eTag.body);
        // @ts-expect-error
        mediatorHttp.mediate.mockClear();
        const mockedStream1 = Readable.from('Distraction Body that should not be set');
        // @ts-expect-error
        ActorHttp.normalizeResponseBody(mockedStream1);
        // @ts-expect-error
        mediatorHttp.mediate.mockResolvedValueOnce(
          // @ts-expect-error
          new Response(mockedStream1, {
            status: 304,
            headers: {
              etag: '123456',
            },
          }),
        );
        const input2 = { input: fo.eTag.request, context };
        const matchResult2 = await actor.run(input2);
        expect(mediatorHttp.mediate).toHaveBeenCalledWith({
          ...input2,
          context: input2.context.set(KeysHttpCache.doNotCheckHttpCache, true),
          init: {
            headers: new Headers({
              'if-none-match': '123456',
            }),
          },
        });
        expect(await matchResult2?.text()).toBe(fo.eTag.body);
        fetch.mockClear();
        // @ts-expect-error
        mediatorHttp.mediate.mockClear();
        const mockedStream2 = Readable.from('The body should be reset to this');
        // @ts-expect-error
        ActorHttp.normalizeResponseBody(mockedStream2);
        fetch.mockResolvedValueOnce(
          // @ts-expect-error
          new Response(mockedStream2, {
            status: 200,
            headers: {
              etag: '7890',
            },
          }),
        );
        const input3 = { input: fo.eTag.request, context };
        const matchResult3 = await actor.run(input3);
        expect(mediatorHttp.mediate).toHaveBeenCalledWith({
          ...input3,
          context: input3.context.set(KeysHttpCache.doNotCheckHttpCache, true),
          init: {
            headers: new Headers({
              'if-none-match': '123456',
            }),
          },
        });
        expect(await matchResult3?.text()).toBe(
          'The body should be reset to this',
        );
      });

      it('does not cache a result if no-store is set', async() => {
        const input = { input: fo.noStore.request, context };
        const matchResult1 = await actor.run(input);
        expect(mediatorHttp.mediate).toHaveBeenCalledWith({
          ...input,
          context: input.context.set(KeysHttpCache.doNotCheckHttpCache, true),
        });
        expect(await matchResult1?.text()).toBe(fo.noStore.body);
        // Should call again because it's not cached
        // @ts-expect-error
        mediatorHttp.mediate.mockClear();
        const matchResult2 = await actor.run(input);
        expect(mediatorHttp.mediate).toHaveBeenCalledWith({
          ...input,
          context: input.context.set(KeysHttpCache.doNotCheckHttpCache, true),
        });
        expect(await matchResult2?.text()).toBe(fo.noStore.body);
      });

      it('returns an undefined body when no body is present', async() => {
        // @ts-expect-error
        mediatorHttp.mediate.mockClear();
        // @ts-expect-error
        mediatorHttp.mediate.mockResolvedValueOnce(
          new Response(undefined, {
            status: 200,
            headers: {
              etag: '123456',
            },
          }),
        );
        const input = { input: fo.plain.request, context };
        const response = await actor.run(input);
        expect(response.body).toBe(null);
      });
    });
  });
});
