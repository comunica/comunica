// eslint-disable-next-line import/no-nodejs-modules
import type { Writable } from 'node:stream';
import CacheHandler from 'undici/types/cache-interceptor';
import CacheStore = CacheHandler.CacheStore;

/**
 * A wrapper around a cache store that adds the `x-comunica-cache: HIT` header to cached responses.
 */
export class MetadataWrappingCacheStore implements CacheStore {
  /**
   * Creates a new metadata-wrapping cache store.
   * @param cacheStore The underlying cache store to delegate to.
   */
  public constructor(private readonly cacheStore: CacheStore) {}

  /**
   * Retrieves a cached response by key, adding the x-comunica-cache header on hit.
   * @param key The cache key to look up.
   * @return The cached result with added metadata header, or undefined on miss.
   */
  public async get(key: CacheHandler.CacheKey): Promise<CacheHandler.GetResult | undefined> {
    const ret = await this.cacheStore.get(key)!;
    if (ret) {
      ret.headers['x-comunica-cache'] = 'HIT';
    }
    return ret;
  }

  /**
   * Creates a writable stream for storing a response in the cache.
   * @param key The cache key to store under.
   * @param val The cache value metadata.
   * @return A writable stream for the response body, or undefined if not storable.
   */
  public createWriteStream(key: CacheHandler.CacheKey, val: CacheHandler.CacheValue): Writable | undefined {
    return this.cacheStore.createWriteStream(key, val);
  }

  /**
   * Deletes a cached response by key.
   * @param key The cache key to remove.
   */
  public delete(key: CacheHandler.CacheKey): void | Promise<void> {
    return this.cacheStore.delete(key);
  }
}
