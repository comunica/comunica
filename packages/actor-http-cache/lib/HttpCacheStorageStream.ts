/**
 * This file will only execute in a NodeJS environment, so nodejs modules are
 * allowed. For the browser version of this file, see HttpCacheStorageStream-browser.ts
 */
// eslint-disable-next-line import/no-nodejs-modules
import { PassThrough, Readable } from 'stream';
import { ActorHttp } from '@comunica/bus-http';
import type { MediatorHttpInvalidate } from '@comunica/bus-http-invalidate';
import { ActionContext } from '@comunica/core';
import type {
  IHttpCacheStorage,
  IHttpCacheStorageValue,
} from '@comunica/types';
import type * as CachePolicy from 'http-cache-semantics';

export class HttpCacheStorageStream
implements IHttpCacheStorage<ReadableStream<Uint8Array>> {
  private readonly bufferCache: IHttpCacheStorage<Buffer>;
  private readonly maxBufferSize: number;
  private readonly mediatorHttpInvalidate?: MediatorHttpInvalidate;
  private currentSessionId = 0;

  /**
   * A mapping between a streamId and information about an incomplete stream
   * An incomplete stream is a stream that has not yet received all of its packages
   * As pacakges come in, they are stored in buffers. If a cache needs an incomplete
   * stream a new stream will be created by combining the buffers and the still-
   * executing stream.
   */
  private incompleteStreams: Record<string, {
    policy: CachePolicy;
    init?: ResponseInit;
    buffers: Uint8Array[];
    streamId: number;
    stream: NodeJS.ReadableStream;
  }> = {};

  public constructor(args: IHttpCacheStorageStreamArgs) {
    this.bufferCache = args.bufferCache;
    this.maxBufferSize = args.maxBufferSize;
    this.mediatorHttpInvalidate = args.mediatorHttpInvalidate;
  }

  public async set(
    key: Request,
    value: IHttpCacheStorageValue<ReadableStream<Uint8Array>>,
    ttl?: number | undefined,
  ): Promise<void> {
    if (!value.body) {
      await this.bufferCache.set(key, { policy: value.policy }, ttl);
      return;
    }
    // In actuality, the body is a NodeJS.Readable
    const body = <NodeJS.ReadableStream><unknown>value.body;
    const streamId = this.currentSessionId++;
    this.incompleteStreams[key.url] = {
      policy: value.policy,
      init: value.init,
      buffers: [],
      streamId,
      stream: body,
    };
    body.on('data', (chunk: any) => {
      if (this.incompleteStreams[key.url] && this.incompleteStreams[key.url].streamId === streamId) {
        this.incompleteStreams[key.url].buffers.push(chunk);
      }
    });
    body.on('end', async() => {
      if (!this.incompleteStreams[key.url] || this.incompleteStreams[key.url].streamId !== streamId) {
        return;
      }
      const combinedBuffer = Buffer.concat(this.incompleteStreams[key.url].buffers);
      if (combinedBuffer.byteLength <= this.maxBufferSize) {
        await this.bufferCache.set(key, { policy: value.policy, body: combinedBuffer, init: value.init }, ttl);
      }
      delete this.incompleteStreams[key.url];
    });
  }

  public async get(
    key: Request,
  ): Promise<IHttpCacheStorageValue<ReadableStream<Uint8Array>> | undefined> {
    if (this.incompleteStreams[key.url]) {
      // Construct a stream from a partial buffer
      const incompleteStreamInfo = this.incompleteStreams[key.url];
      let passThrough = new PassThrough();
      const currentBufferStream = Readable.from(Buffer.concat(incompleteStreamInfo.buffers));
      passThrough = currentBufferStream.pipe(passThrough, { end: false });
      passThrough = incompleteStreamInfo.stream.pipe(passThrough, { end: false });
      incompleteStreamInfo.stream.on('end', () => passThrough.emit('end'));
      // NormalizeResponseBody is able to handle a NodeJS.ReadableStream but requires a ReadableStream type
      ActorHttp.normalizeResponseBody(<ReadableStream<Uint8Array>><unknown>passThrough);
      return {
        body: <ReadableStream<Uint8Array>><unknown>passThrough,
        policy: incompleteStreamInfo.policy,
        init: incompleteStreamInfo.init,
      };
    }
    // Reconstruct the value from the cache
    const cacheValue = await this.bufferCache.get(key);
    if (!cacheValue) {
      return undefined;
    }
    if (!cacheValue.body) {
      return {
        policy: cacheValue.policy,
        init: cacheValue.init,
      };
    }
    const newStream = Readable.from(cacheValue.body);
    ActorHttp.normalizeResponseBody(<ReadableStream<Uint8Array>><unknown>newStream);
    return {
      policy: cacheValue.policy,
      init: cacheValue.init,
      body: <ReadableStream<Uint8Array>><unknown>newStream,
    };
  }

  public async delete(key: Request): Promise<boolean> {
    const wasInIncompleteStream = Boolean(this.incompleteStreams[key.url]);
    delete this.incompleteStreams[key.url];
    const wasInBufferCache = await this.bufferCache.delete(key);
    await this.invalidate(key.url);
    return wasInIncompleteStream || wasInBufferCache;
  }

  public async clear(): Promise<void> {
    await Promise.all(Object.keys(this.incompleteStreams).map(async key => {
      await this.invalidate(key);
    }));
    this.incompleteStreams = {};
    await this.bufferCache.clear();
  }

  public async has(key: Request): Promise<boolean> {
    return Boolean(this.incompleteStreams[key.url]) || await this.bufferCache.has(key);
  }

  private async invalidate(key: string): Promise<void> {
    if (this.mediatorHttpInvalidate) {
      await this.mediatorHttpInvalidate.mediate({ url: key, context: new ActionContext() });
    }
  }
}

interface IHttpCacheStorageStreamArgs {
  bufferCache: IHttpCacheStorage<Buffer>;
  maxBufferSize: number;
  mediatorHttpInvalidate?: MediatorHttpInvalidate;
}
