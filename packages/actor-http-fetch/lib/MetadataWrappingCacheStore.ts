// eslint-disable-next-line import/no-nodejs-modules
import type { Writable } from 'node:stream';
import CacheHandler from 'undici/types/cache-interceptor';
import CacheStore = CacheHandler.CacheStore;

/**
 * A wrapper around a cache store that adds the `x-comunica-cache: HIT` header to cached responses.
 */
export class MetadataWrappingCacheStore implements CacheStore {
  public constructor(private readonly cacheStore: CacheStore) {}

  public async get(key: CacheHandler.CacheKey): Promise<CacheHandler.GetResult | undefined> {
    const ret = await this.cacheStore.get(key)!;
    if (ret) {
      ret.headers['x-comunica-cache'] = 'HIT';
    }
    return ret;
  }

  public createWriteStream(key: CacheHandler.CacheKey, val: CacheHandler.CacheValue): Writable | undefined {
    return this.cacheStore.createWriteStream(key, val);
  }

  public delete(key: CacheHandler.CacheKey): void | Promise<void> {
    return this.cacheStore.delete(key);
  }
}
