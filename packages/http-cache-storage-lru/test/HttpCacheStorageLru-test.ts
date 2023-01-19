import type {
  IActionHttpInvalidate,
  IActorHttpInvalidateOutput,
  MediatorHttpInvalidate,
} from '@comunica/bus-http-invalidate';
import { ActionContext } from '@comunica/core';
import 'cross-fetch/polyfill';
import * as CachePolicy from 'http-cache-semantics';
import { HttpCacheStorageLru } from '../lib/HttpCacheStorageLru';

describe('HttpCacheStorageLru', () => {
  let mediatorHttpInvalidate: MediatorHttpInvalidate;

  beforeEach(() => {
    // @ts-expect-error
    mediatorHttpInvalidate = {
      mediate: jest.fn(async(action: IActionHttpInvalidate): Promise<IActorHttpInvalidateOutput> => ({})),
    };
  });

  it('performs as a cache', async() => {
    const cache = new HttpCacheStorageLru({ max: 10, mediatorHttpInvalidate });
    const request = new Request('https://example.com/');
    const response = new Response('Test Body');
    const policy = new CachePolicy({ headers: {}}, { headers: {}});
    await cache.set(request, { body: Buffer.from(await response.arrayBuffer()), policy });
    const retrieved = await cache.get(request);
    expect(retrieved?.policy).toEqual(policy);
    expect(retrieved?.body?.toString()).toEqual('Test Body');
    expect(await cache.delete(new Request('https://otherExample.com'))).toBe(false);
    await cache.clear();
    expect(await cache.has(request)).toBe(false);
  });

  it('Calls http invalidate when a value is discarded', async() => {
    const cache = new HttpCacheStorageLru({ max: 1, mediatorHttpInvalidate });

    const request1 = new Request('https://example.com/1');
    const value1 = { body: Buffer.from('test1'), policy: new CachePolicy({ headers: {}}, { headers: {}}) };
    await cache.set(request1, value1);

    const request2 = new Request('https://example.com/2');
    const value2 = { body: Buffer.from('test2'), policy: new CachePolicy({ headers: {}}, { headers: {}}) };
    await cache.set(request2, value2);

    expect(mediatorHttpInvalidate.mediate).toHaveBeenCalledWith({ url: request1.url, context: new ActionContext() });
  });

  it('doesn\'t error when not httpInvalidate is provided', async() => {
    const cache = new HttpCacheStorageLru({ max: 1 });

    const request1 = new Request('https://example.com/1');
    const value1 = { body: Buffer.from('test1'), policy: new CachePolicy({ headers: {}}, { headers: {}}) };
    await cache.set(request1, value1);

    const request2 = new Request('https://example.com/2');
    const value2 = { body: Buffer.from('test2'), policy: new CachePolicy({ headers: {}}, { headers: {}}) };
    await cache.set(request2, value2);

    expect(mediatorHttpInvalidate.mediate).not.toHaveBeenCalled();
  });
});
