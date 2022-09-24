import type { ActorHttp, IActionHttp, MediatorHttp } from '@comunica/bus-http';
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
    let mediatorHttp: MediatorHttp;

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

      actor = new ActorHttpCache({
        name: 'actor',
        bus,
        cacheStorage: new HttpCacheStorageLru({ max: 10 }),
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

    // Describe('put', () => {
    //   it('puts a response that should be valid', async() => {
    //     await actor.put(fo.maxAge.request, fo.maxAge.body, fo.maxAge.responseInit);
    //     const cachedResponse = await actor.fetchWithCache({ input: fo.maxAge.request, context });
    //     expect(await cachedResponse?.text()).toBe(fo.maxAge.body);
    //     expect(fetch).not.toHaveBeenCalled();
    //   });

    //   it('throws an error when trying to add an invalid request', async() => {
    //     await expect(
    //       actor.put(fo.noStore.request, fo.noStore.body, fo.noStore.responseInit),
    //     ).rejects.toThrow(`${fo.noStore.uri} is not storable.`);
    //   });
    // });

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
        // @ts-expect-error
        mediatorHttp.mediate.mockResolvedValueOnce(
          new Response('Distraction Body that should not be set', {
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
        fetch.mockResolvedValueOnce(
          new Response('The body should be reset to this', {
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
    });

    // Describe('has', () => {
    //   it('returns false when a request is not in the cache', async() => {
    //     expect(await actor.has(fo.plain.request)).toBe(false);
    //   });

    //   it('returns true if the request is in the cache', async() => {
    //     await actor.put(fo.maxAge.request, fo.maxAge.body, fo.maxAge.response);
    //     expect(await actor.has(fo.maxAge.request)).toBe(true);
    //   });

    //   it('returns false if the request is in the cache but it is stale', async() => {
    //     await actor.put(fo.plain.request, fo.plain.body, fo.plain.responseInit);
    //     expect(await actor.has(fo.plain.request)).toBe(false);
    //   });
    // });
  });
});
