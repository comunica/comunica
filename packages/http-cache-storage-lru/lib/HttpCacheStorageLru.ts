import type { IHttpCacheStorage, IHttpCacheStorageValue } from '@comunica/http-cache-storage';
import * as LRU from 'lru-cache';

export class HttpCacheStorageLru implements IHttpCacheStorage {
  private readonly cache: LRU<string, IHttpCacheStorageValue>;

  public constructor(args: IHttpCacheLruArgs) {
    this.cache = new LRU({ max: args.max });
  }

  public async set(key: Request, value: IHttpCacheStorageValue, ttl?: number | undefined): Promise<void> {
    this.cache.set(key.url, value);
  }

  public async get(key: Request): Promise<IHttpCacheStorageValue | undefined> {
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
  max: number;
}
