import { Bus } from '@comunica/core';
import { HttpCacheStorageLru } from '@comunica/http-cache-storage-lru';
import { CacheSemanticsHandler } from '../lib';
import type { FetchOptions } from './http-test-helper';
import { getHttpTestHelpers } from './http-test-helper';

describe('ActorHttpCache', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorHttpCache instance', () => {
    let handler: CacheSemanticsHandler;
    let fetch: jest.Mock<
    Promise<Response>,
    [input: RequestInfo, init?: RequestInit | undefined]
    >;
    let fo: FetchOptions;

    beforeEach(() => {
      const helpers = getHttpTestHelpers();
      fetch = helpers.fetch;
      fo = helpers.fo;
      handler = new CacheSemanticsHandler(
        new HttpCacheStorageLru({ lruOptions: { max: 10 }}),
      );
    });

    describe('put', () => {
      it('puts a response that should be valid', async() => {
        await handler.put(fo.maxAge.request, fo.maxAge.response);
        const cachedResponse = await handler.fetchWithCache(fo.maxAge.request, fetch);
        expect(await cachedResponse?.text()).toBe(fo.maxAge.body);
        expect(fetch).not.toHaveBeenCalled();
      });

      it('throws an error when trying to add an invalid request', async() => {
        await expect(
          handler.put(fo.noStore.request, fo.noStore.response),
        ).rejects.toThrow(`${fo.noStore.uri} is not storable.`);
      });
    });

    describe('match', () => {
      it('performs a fetch when there is nothing in the cache.', async() => {
        await handler.fetchWithCache(fo.maxAge.request, fetch);
        expect(fetch).toHaveBeenCalledWith(fo.maxAge.request);
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      it('does not perform a fetch when the cache is not stale', async() => {
        const matchResult1 = await handler.fetchWithCache(fo.maxAge.request, fetch);
        expect(await matchResult1?.text()).toBe(fo.maxAge.body);
        const matchResult2 = await handler.fetchWithCache(fo.maxAge.request, fetch);
        expect(fetch).toHaveBeenCalledWith(fo.maxAge.request);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(await matchResult2?.text()).toBe(fo.maxAge.body);
      });

      it('performs a fetch when the cache is stale', async() => {
        await handler.fetchWithCache(fo.plain.request, fetch);
        await handler.fetchWithCache(fo.plain.request, fetch);
        expect(fetch).toHaveBeenCalledWith(fo.plain.request);
        expect(fetch).toHaveBeenCalledTimes(2);
      });

      it('makes a request with the proper headers when an etag is present', async() => {
        const matchResult1 = await handler.fetchWithCache(fo.eTag.request, fetch);
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
        const matchResult2 = await handler.fetchWithCache(fo.eTag.request, fetch);
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
        const matchResult3 = await handler.fetchWithCache(fo.eTag.request, fetch);
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
        expect(await handler.has(fo.plain.request)).toBe(false);
      });

      it('returns true if the request is in the cache', async() => {
        await handler.put(fo.maxAge.request, fo.maxAge.response);
        expect(await handler.has(fo.maxAge.request)).toBe(true);
      });

      it('returns false if the request is in the cache but it is stale', async() => {
        await handler.put(fo.plain.request, fo.plain.response);
        expect(await handler.has(fo.plain.request)).toBe(false);
      });
    });
  });
});
