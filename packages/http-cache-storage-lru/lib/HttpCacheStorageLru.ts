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
          const splitKey = key.split('-');
          splitKey.shift();
          await args.mediatorHttpInvalidate.mediate({
            url: splitKey.join(''),
            context: new ActionContext(),
          });
        }
      },
    });
  }

  private getRequestKey(key: Request): string {
    return `${key.method}-${key.url}`;
  }

  public async set(key: Request, value: IHttpCacheStorageValue<Buffer>, ttl?: number | undefined): Promise<void> {
    this.cache.set(this.getRequestKey(key), value);
  }

  public async get(key: Request): Promise<IHttpCacheStorageValue<Buffer> | undefined> {
    return this.cache.get(this.getRequestKey(key));
  }

  public async delete(key: Request): Promise<boolean> {
    return this.cache.delete(this.getRequestKey(key));
  }

  public async clear(): Promise<void> {
    this.cache.clear();
  }

  public async has(key: Request): Promise<boolean> {
    return this.cache.has(this.getRequestKey(key));
  }
}

export interface IHttpCacheLruArgs {
  /**
   * Maximum items stored in the cache
   */
  max: number;
  mediatorHttpInvalidate?: MediatorHttpInvalidate;
}
