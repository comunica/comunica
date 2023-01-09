import { Readable } from 'stream';
import { ActorHttp } from '@comunica/bus-http';
import type {
  IActionHttpInvalidate,
  IActorHttpInvalidateOutput,
  MediatorHttpInvalidate,
} from '@comunica/bus-http-invalidate';
import 'cross-fetch/polyfill';
import { ActionContext } from '@comunica/core';
import { HttpCacheStorageLru } from '@comunica/http-cache-storage-lru';
import * as CachePolicy from 'http-cache-semantics';
import { HttpCacheStorageStream } from '../lib/HttpCacheStorageStream';
import { testStream } from './testStream';

describe('HttpCacheStorageStream', () => {
  let exampleRequest: Request;
  let examplePolicy: CachePolicy;
  let stream: ReadableStream<Uint8Array> & Readable;
  let returnStream: ReadableStream<Uint8Array> & Readable;
  let cacheStream: ReadableStream<Uint8Array> & Readable;
  let cache: HttpCacheStorageStream;
  let mediatorHttpInvalidate: MediatorHttpInvalidate;

  function createStream() {
    const createdStream = <Readable & ReadableStream> <unknown> new Readable();
    // Add the tee method to the Node Stream
    ActorHttp.normalizeResponseBody(createdStream);
    return createdStream;
  }

  beforeEach(() => {
    exampleRequest = new Request('https://example.com/');
    examplePolicy = new CachePolicy({ headers: {}}, { headers: {}});

    stream = createStream();
    const [ stream1, stream2 ] = stream.tee();
    returnStream = <ReadableStream<Uint8Array> & Readable> stream1;
    cacheStream = <ReadableStream<Uint8Array> & Readable> stream2;

    // @ts-expect-error
    mediatorHttpInvalidate = {
      mediate: jest.fn(async(action: IActionHttpInvalidate): Promise<IActorHttpInvalidateOutput> => ({})),
    };

    cache = new HttpCacheStorageStream({
      bufferCache: new HttpCacheStorageLru({
        max: 100,
        mediatorHttpInvalidate,
      }),
      maxBufferSize: 1_000,
      mediatorHttpInvalidate,
    });
  });

  afterEach(() => {
    stream.destroy();
  });

  it('retrieves cache when there is no body', async() => {
    await testStream(async expectStreamToYeild => {
      await cache.set(exampleRequest, {
        policy: examplePolicy,
        body: cacheStream,
      });
      const retrieved = await cache.get(exampleRequest);

      expectStreamToYeild(returnStream, '');
      expectStreamToYeild(retrieved?.body, '');

      stream.push(null);
    });
  });

  it('retriews cache when the first part of a single chunk body has come in', async() => {
    await testStream(async expectStreamToYeild => {
      await cache.set(exampleRequest, {
        policy: examplePolicy,
        body: cacheStream,
      });
      expectStreamToYeild(returnStream, 'a');
      stream.push('a');
      const retrieved = await cache.get(exampleRequest);
      expectStreamToYeild(retrieved?.body, 'a');
      stream.push(null);
    });
  });

  it('retriews cache when the first part of a multi-chunk body has come in', async() => {
    await testStream(async expectStreamToYeild => {
      await cache.set(exampleRequest, {
        policy: examplePolicy,
        body: cacheStream,
      });
      expectStreamToYeild(returnStream, 'abc');
      stream.push('a');
      const retrieved = await cache.get(exampleRequest);
      expectStreamToYeild(retrieved?.body, 'abc');
      stream.push('b');
      stream.push('c');
      stream.push(null);
    });
  });

  it('retriews cache when the middle part of a multi-chunk body has come in', async() => {
    await testStream(async expectStreamToYeild => {
      await cache.set(exampleRequest, {
        policy: examplePolicy,
        body: cacheStream,
      });
      expectStreamToYeild(returnStream, 'abc');
      stream.push('a');
      stream.push('b');
      const retrieved = await cache.get(exampleRequest);
      expectStreamToYeild(retrieved?.body, 'abc');
      stream.push('c');
      stream.push(null);
    });
  });

  it('retriews cache when the final part of a multi-chunk body has come in', async() => {
    await testStream(async expectStreamToYeild => {
      await cache.set(exampleRequest, {
        policy: examplePolicy,
        body: cacheStream,
      });
      expectStreamToYeild(returnStream, 'abc');
      stream.push('a');
      stream.push('b');
      stream.push('c');
      const retrieved = await cache.get(exampleRequest);
      expectStreamToYeild(retrieved?.body, 'abc');
      stream.push(null);
    });
  });

  it('retriews cache when a stream is complete', async() => {
    await testStream(async expectStreamToYeild => {
      await cache.set(exampleRequest, {
        policy: examplePolicy,
        body: cacheStream,
      });
      expectStreamToYeild(returnStream, 'abc');
      stream.push('a');
      stream.push('b');
      stream.push('c');
      stream.push(null);
      // Simulate async
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      const retrieved = await cache.get(exampleRequest);
      expectStreamToYeild(retrieved?.body, 'abc');
    });
  });

  it('cache is overwritten even when mid-stream', async() => {
    await testStream(async expectStreamToYeild => {
      const otherStream = createStream();
      await cache.set(exampleRequest, {
        policy: examplePolicy,
        body: cacheStream,
      });
      expectStreamToYeild(returnStream, 'abc');
      stream.push('a');
      stream.push('b');
      await cache.set(exampleRequest, {
        policy: examplePolicy,
        body: otherStream,
      });
      otherStream.push('d');
      stream.push('c');
      otherStream.push('e');
      const retrieved = await cache.get(exampleRequest);
      expectStreamToYeild(retrieved?.body, 'def');
      stream.push(null);
      otherStream.push('f');
      otherStream.push(null);
    });
  });

  it('sets cache with no body', async() => {
    await cache.set(exampleRequest, { policy: examplePolicy });
    const cachedValue = await cache.get(exampleRequest);
    expect(cachedValue?.body).toBeUndefined();
  });

  it('does not return a value if one has not been set', async() => {
    const val = await cache.get(exampleRequest);
    expect(val).toBeUndefined();
  });

  it('deletes a value mid stream', async() => {
    await testStream(async expectStreamToYeild => {
      await cache.set(exampleRequest, {
        policy: examplePolicy,
        body: cacheStream,
      });
      expectStreamToYeild(returnStream, 'abc');
      stream.push('a');
      stream.push('b');
      await cache.delete(exampleRequest);
      expect(await cache.has(exampleRequest)).toBe(false);
      stream.push('c');
      stream.push(null);
      expect(await cache.has(exampleRequest)).toBe(false);
    });
  });

  it('deletes a value after stream', async() => {
    await testStream(async expectStreamToYeild => {
      await cache.set(exampleRequest, {
        policy: examplePolicy,
        body: cacheStream,
      });
      expectStreamToYeild(returnStream, 'abc');
      stream.push('a');
      stream.push('b');
      stream.push('c');
      stream.push(null);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      await cache.delete(exampleRequest);
      expect(await cache.has(exampleRequest)).toBe(false);
    });
  });

  it('clears values', async() => {
    await cache.set(exampleRequest, {
      policy: examplePolicy,
      body: cacheStream,
    });
    await cache.clear();
    expect(await cache.has(exampleRequest)).toBe(false);
  });

  it('Calls http invalidate when a value is discarded', async() => {
    await cache.set(exampleRequest, { policy: examplePolicy, body: cacheStream });
    await cache.delete(exampleRequest);
    expect(mediatorHttpInvalidate.mediate)
      .toHaveBeenCalledWith({ url: exampleRequest.url, context: new ActionContext() });
  });

  it('doesn\'t error when not httpInvalidate is provided', async() => {
    cache = new HttpCacheStorageStream({
      bufferCache: new HttpCacheStorageLru({
        max: 100,
      }),
      maxBufferSize: 1_000,
    });
    await cache.set(exampleRequest, { policy: examplePolicy, body: cacheStream });
    await cache.delete(exampleRequest);
    expect(mediatorHttpInvalidate.mediate).not.toHaveBeenCalled();
  });
});
