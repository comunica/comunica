import type { MediatorHttpInvalidate } from '@comunica/bus-http-invalidate';
import { ActionContext } from '@comunica/core';
import type { IHttpCacheStorage, IHttpCacheStorageValue } from '@comunica/types';
import * as LRU from 'lru-cache';

export class HttpCacheStorageLru implements IHttpCacheStorage<Buffer> {
  private readonly cache: LRU<string, IHttpCacheStorageValue<Buffer>>;

  public constructor(args: IHttpCacheLruArgs) {
    this.cache = new LRU({
      max: args.max,
      async dispose(value, key) {
        if (args.mediatorHttpInvalidate) {
          await args.mediatorHttpInvalidate.mediate({ url: key, context: new ActionContext() });
        }
      },
    });
  }

  public async set(key: Request, value: IHttpCacheStorageValue<Buffer>, ttl?: number | undefined): Promise<void> {
    this.cache.set(key.url, value);
  }

  public async get(key: Request): Promise<IHttpCacheStorageValue<Buffer> | undefined> {
    return this.cache.get(key.url);
  }

  public async delete(key: Request): Promise<boolean> {
    return this.cache.delete(key.url);
  }

  public async clear(): Promise<void> {
    this.cache.clear();
  }

  public async has(key: Request): Promise<boolean> {
    return this.cache.has(key.url);
  }
}

export interface IHttpCacheLruArgs {
  /**
   * Maximum items stored in the cache
   */
  max: number;
  mediatorHttpInvalidate?: MediatorHttpInvalidate;
}
