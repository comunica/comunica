import { KeysHttp } from '@comunica/context-entries';
import { Bus, ActionContext } from '@comunica/core';
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

    beforeEach(() => {
      const helpers = getHttpTestHelpers();
      fetch = helpers.fetch;
      fo = helpers.fo;
      actor = new ActorHttpCache({
        name: 'actor',
        bus,
        cacheStorage: new HttpCacheStorageLru({ lruOptions: { max: 10 }}),
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
  });
});
