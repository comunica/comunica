import type {
  ActorHttpInvalidateListenable,
  IActionHttpInvalidate,
  IActorHttpInvalidateOutput,
  IInvalidateListener,
  MediatorHttpInvalidate,
} from '@comunica/bus-http-invalidate';
import { KeysHttp } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
import type { IHttpCacheStorage } from '@comunica/http-cache-storage';
import { HttpCacheStorageLru } from '@comunica/http-cache-storage-lru';
import { ActorHttpCache } from '../lib/ActorHttpCache';
import type { FetchOptions } from './http-test-helper';
import { getHttpTestHelpers } from './http-test-helper';

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

      actor = new ActorHttpCache({
        name: 'actor',
        bus,
        cacheStorage: new HttpCacheStorageLru({ max: 10 }),
        mediatorHttpInvalidate,
        httpInvalidator,
      });
    });

    it('has a test return infinity if the request is not in the chache', async() => {
      expect(
        await actor.test({ input: fo.plain.uri, context: new ActionContext({}) }),
      ).toEqual({ time: Number.POSITIVE_INFINITY });
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

    it('has an item return 1 if an item is in the cache', async() => {
      await actor.run({
        input: fo.maxAge.uri,
        context: new ActionContext({ [KeysHttp.fetch.name]: fetch }),
      });
      expect(await actor.test({
        input: fo.maxAge.uri,
        context: new ActionContext({ [KeysHttp.fetch.name]: fetch }),
      })).toEqual({ time: 1 });
    });

    describe('invalidate cache', () => {
      let cacheStorage: IHttpCacheStorage;

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
        });
        expect(cacheStorage.clear).toHaveBeenCalled();
      });
    });

    describe('put', () => {
      it('puts a response that should be valid', async() => {
        await actor.put(fo.maxAge.request, fo.maxAge.response);
        const cachedResponse = await actor.fetchWithCache(fo.maxAge.request, fetch, context);
        expect(await cachedResponse?.text()).toBe(fo.maxAge.body);
        expect(fetch).not.toHaveBeenCalled();
      });

      it('throws an error when trying to add an invalid request', async() => {
        await expect(
          actor.put(fo.noStore.request, fo.noStore.response),
        ).rejects.toThrow(`${fo.noStore.uri} is not storable.`);
      });
    });

    describe('fetchWithCache', () => {
      it('performs a fetch when there is nothing in the cache.', async() => {
        await actor.fetchWithCache(fo.maxAge.request, fetch, context);
        expect(fetch).toHaveBeenCalledWith(fo.maxAge.request);
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      it('does not perform a fetch when the cache is not stale', async() => {
        const matchResult1 = await actor.fetchWithCache(fo.maxAge.request, fetch, context);
        expect(await matchResult1?.text()).toBe(fo.maxAge.body);
        const matchResult2 = await actor.fetchWithCache(fo.maxAge.request, fetch, context);
        expect(fetch).toHaveBeenCalledWith(fo.maxAge.request);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(await matchResult2?.text()).toBe(fo.maxAge.body);
      });

      it('performs a fetch when the cache is stale', async() => {
        await actor.fetchWithCache(fo.plain.request, fetch, context);
        await actor.fetchWithCache(fo.plain.request, fetch, context);
        expect(fetch).toHaveBeenCalledWith(fo.plain.request);
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(mediatorHttpInvalidate.mediate).toHaveBeenCalledWith({ url: fo.plain.uri, context });
      });

      it('makes a request with the proper headers when an etag is present', async() => {
        const matchResult1 = await actor.fetchWithCache(fo.eTag.request, fetch, context);
        expect(fetch).toHaveBeenCalledWith(fo.eTag.request);
        expect(await matchResult1?.text()).toBe(fo.eTag.body);
        fetch.mockClear();
        fetch.mockResolvedValueOnce(
          new Response('Distraction Body that should not be set', {
            status: 304,
            headers: {
              etag: '123456',
            },
          }),
        );
        const matchResult2 = await actor.fetchWithCache(fo.eTag.request, fetch, context);
        expect(fetch).toHaveBeenCalledWith(
          new Request(fo.eTag.uri, {
            headers: {
              'if-none-match': '123456',
            },
          }),
        );
        expect(await matchResult2?.text()).toBe(fo.eTag.body);
        fetch.mockClear();
        fetch.mockResolvedValueOnce(
          new Response('The body should be reset to this', {
            status: 200,
            headers: {
              etag: '7890',
            },
          }),
        );
        const matchResult3 = await actor.fetchWithCache(fo.eTag.request, fetch, context);
        expect(fetch).toHaveBeenCalledWith(
          new Request(fo.eTag.uri, {
            headers: {
              'if-none-match': '123456',
            },
          }),
        );
        expect(await matchResult3?.text()).toBe(
          'The body should be reset to this',
        );
      });
    });

    describe('has', () => {
      it('returns false when a request is not in the cache', async() => {
        expect(await actor.has(fo.plain.request)).toBe(false);
      });

      it('returns true if the request is in the cache', async() => {
        await actor.put(fo.maxAge.request, fo.maxAge.response);
        expect(await actor.has(fo.maxAge.request)).toBe(true);
      });

      it('returns false if the request is in the cache but it is stale', async() => {
        await actor.put(fo.plain.request, fo.plain.response);
        expect(await actor.has(fo.plain.request)).toBe(false);
      });
    });
  });
});
