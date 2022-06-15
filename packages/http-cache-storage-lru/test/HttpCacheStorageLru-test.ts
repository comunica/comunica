import 'cross-fetch/polyfill';
import * as CachePolicy from 'http-cache-semantics';
import { HttpCacheStorageLru } from '../lib/HttpCacheStorageLru';

describe('HttpCacheStorageLru', () => {
  it('performs as a cache', async() => {
    const cache = new HttpCacheStorageLru({ max: 10 });
    const request = new Request('https://example.com/');
    const response = new Response('Test Body');
    const policy = new CachePolicy({ headers: {}}, { headers: {}});
    await cache.set(request, { response, policy });
    expect(await cache.get(request)).toEqual({ response, policy });
    expect(await cache.delete(new Request('https://otherExample.com'))).toBe(false);
    await cache.clear();
    expect(await cache.has(request)).toBe(false);
  });
});
