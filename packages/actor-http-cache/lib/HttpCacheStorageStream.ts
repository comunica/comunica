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
import { v4 } from 'uuid';

export class HttpCacheStorageStream
implements IHttpCacheStorage<ReadableStream<Uint8Array>> {
  private readonly bufferCache: IHttpCacheStorage<Buffer>;
  private readonly maxBufferSize: number;
  private readonly mediatorHttpInvalidate?: MediatorHttpInvalidate;

  private incompleteStreams: Record<string, {
    policy: CachePolicy;
    init?: ResponseInit;
    buffers: Uint8Array[];
    streamId: string;
    stream: ReadableStream<Uint8Array>;
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
    const streamId = v4();
    this.incompleteStreams[key.url] = {
      policy: value.policy,
      init: value.init,
      buffers: [],
      streamId,
      stream: value.body,
    };
    // @ts-expect-error In actuality, this is a NodeJS.Readable
    value.body.on('data', (chunk: any) => {
      if (this.incompleteStreams[key.url] && this.incompleteStreams[key.url].streamId === streamId) {
        this.incompleteStreams[key.url].buffers.push(chunk);
      }
    });
    // @ts-expect-error In actuality, this is a NodeJS.Readable
    value.body.on('end', async() => {
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
      // @ts-expect-error In actuality, this is a NodeJS.Readable
      passThrough = incompleteStreamInfo.stream.pipe(passThrough, { end: false });
      // @ts-expect-error In actuality, this is a NodeJS.Readable
      incompleteStreamInfo.stream.on('end', () => passThrough.emit('end'));
      // @ts-expect-error In actuality, this is a NodeJS.Readable
      ActorHttp.normalizeResponseBody(passThrough);
      return {
        // @ts-expect-error Passthrough is a type of NodeJS.Readable
        body: passThrough,
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
    // @ts-expect-error Passthrough is a type of NodeJS.Readable
    ActorHttp.normalizeResponseBody(newStream);
    return {
      policy: cacheValue.policy,
      init: cacheValue.init,
      // @ts-expect-error NewStream is a type of NodeJS.Readable
      body: newStream,
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
    const isInIncompleteStream = Boolean(this.incompleteStreams[key.url]);
    const isInBufferCache = await this.bufferCache.has(key);
    return isInIncompleteStream || isInBufferCache;
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
