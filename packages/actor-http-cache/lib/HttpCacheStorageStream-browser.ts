/* eslint-disable unicorn/filename-case */
/* eslint-enable unicorn/filename-case */

import { EventEmitter } from 'events';
import { ActorHttp } from '@comunica/bus-http';
import type { MediatorHttpInvalidate } from '@comunica/bus-http-invalidate';
import { ActionContext } from '@comunica/core';
import type {
  IHttpCacheStorage,
  IHttpCacheStorageValue,
} from '@comunica/types';
import type * as CachePolicy from 'http-cache-semantics';

/**
 * Merges multiple Uint8 Arrays into one
 * @param arrays Uint8Arrays
 * @returns a single Uint8Array
 */
function mergeUintArrays(arrays: Uint8Array[]): Uint8Array {
  // Get the total length of all arrays.
  let length = 0;
  arrays.forEach(item => {
    length += item.length;
  });

  // Create a new array with total length and merge all source arrays.
  const mergedArray = new Uint8Array(length);
  let offset = 0;
  arrays.forEach(item => {
    mergedArray.set(item, offset);
    offset += item.length;
  });
  return mergedArray;
}

export class HttpCacheStorageStream
implements IHttpCacheStorage<ReadableStream<Uint8Array>> {
  private readonly bufferCache: IHttpCacheStorage<Buffer>;
  private readonly maxBufferSize: number;
  private readonly mediatorHttpInvalidate?: MediatorHttpInvalidate;
  private currentSessionId = 0;

  /**
   * A mapping between a URL and information about an incomplete stream
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
    stream: EventEmitter;
  }> = {};

  public constructor(args: IHttpCacheStorageStreamArgs) {
    this.bufferCache = args.bufferCache;
    this.maxBufferSize = args.maxBufferSize;
    this.mediatorHttpInvalidate = args.mediatorHttpInvalidate;
  }

  public async set(
    key: Request,
    storageValue: IHttpCacheStorageValue<ReadableStream<Uint8Array>>,
    ttl?: number | undefined,
  ): Promise<void> {
    if (!storageValue.body) {
      await this.bufferCache.set(key, { policy: storageValue.policy }, ttl);
      return;
    }
    const body = storageValue.body;
    const streamId = this.currentSessionId++;
    const bodyEventEmitter = new EventEmitter();
    const bodyReader = body.getReader();
    // Make this stream into an event emitter
    bodyReader.read().then(async function readStream2({ done, value }): Promise<void> {
      if (done) {
        bodyEventEmitter.emit('end');
      } else {
        bodyEventEmitter.emit('data', value);
        return bodyReader.read().then(readStream2);
      }
    }).catch(error => {
      // Remove the stream from incompleteStreams if it errrors
      if (this.incompleteStreams[key.url] && this.incompleteStreams[key.url].streamId === streamId) {
        delete this.incompleteStreams[key.url];
      }
    });

    this.incompleteStreams[key.url] = {
      policy: storageValue.policy,
      init: storageValue.init,
      buffers: [],
      streamId,
      stream: bodyEventEmitter,
    };

    bodyEventEmitter.on('data', (chunk: any) => {
      if (this.incompleteStreams[key.url] && this.incompleteStreams[key.url].streamId === streamId) {
        this.incompleteStreams[key.url].buffers.push(chunk);
      }
    });
    bodyEventEmitter.on('end', async() => {
      if (!this.incompleteStreams[key.url] || this.incompleteStreams[key.url].streamId !== streamId) {
        return;
      }
      const combinedBuffer = mergeUintArrays(this.incompleteStreams[key.url].buffers);
      if (combinedBuffer.byteLength <= this.maxBufferSize) {
        await this.bufferCache.set(key, {
          policy: storageValue.policy,
          body: Buffer.from(combinedBuffer),
          init: storageValue.init,
        }, ttl);
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
      const newStream = new ReadableStream<Uint8Array>({
        start(controller) {
          incompleteStreamInfo.buffers.forEach(buffer => {
            controller.enqueue(buffer);
          });
          incompleteStreamInfo.stream.on('data', chunk => {
            controller.enqueue(chunk);
          });
          incompleteStreamInfo.stream.on('end', () => {
            controller.close();
          });
        },
      });

      ActorHttp.normalizeResponseBody(newStream);
      return {
        body: newStream,
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
    const newStream = new ReadableStream({
      start(controller) {
        controller.enqueue(cacheValue.body);
        controller.close();
      },
    });
    ActorHttp.normalizeResponseBody(newStream);
    return {
      policy: cacheValue.policy,
      init: cacheValue.init,
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
