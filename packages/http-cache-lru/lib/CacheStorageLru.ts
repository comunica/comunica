import { CacheLru } from './CacheLru';
import type ICacheLruOptions from './ICacheLruOptions';

export class CacheStorageLru implements CacheStorage {
  private caches: Record<string, Cache> = {};
  private options: ICacheLruOptions | undefined;

  /**
   * The delete() method of the CacheStorage interface finds the Cache object
   * matching the cacheName, and if found, deletes the Cache object and returns
   * a Promise that resolves to true. If no Cache object is found, it resolves
   * to false.
   * @param cacheName The name of the cache you want to delete.
   */
  public async delete(cacheName: string): Promise<boolean> {
    const hasCache = await this.has(cacheName);
    if (hasCache) {
      delete this.caches[cacheName];
    }
    return hasCache;
  }

  /**
   * The has() method of the CacheStorage interface returns a Promise that
   * resolves to true if a Cache object matches the cacheName.
   * @param cacheName A string representing the name of the Cache object you are
   * looking for in the CacheStorage.
   * @returns a Promise that resolves to true if the cache exists or false if
   * not.
   */
  public async has(cacheName: string): Promise<boolean> {
    return Boolean(this.caches[cacheName]);
  }

  /**
   * The keys() method of the CacheStorage interface returns a Promise that will
   * resolve with an array containing strings corresponding to all of the named
   * Cache objects tracked by the CacheStorage object in the order they were
   * created. Use this method to iterate over a list of all Cache objects.
   */
  public async keys(): Promise<string[]> {
    return Object.keys(this.caches);
  }

  /**
   * The match() method of the CacheStorage interface checks if a given Request
   * or URL string is a key for a stored Response. This method returns a Promise
   * for a Response, or a Promise which resolves to undefined if no match is
   * found.
   * @param request The Request you want to match. This can be a Request object
   * or a URL string.
   * @param options An object whose properties control how matching is done in
   * the match operation. The available options are:
   */
  public async match(
    _request: RequestInfo,
    _options?: MultiCacheQueryOptions,
  ): Promise<Response | undefined> {
    throw new Error('Not Implemented');
  }

  /**
   * The open() method of the CacheStorage interface returns a Promise that
   * resolves to the Cache object matching the cacheName.
   * @param cacheName The name of the cache you want to open.
   * @returns A Promise that resolves to the requested Cache object.
   */
  public async open(cacheName: string): Promise<Cache> {
    if (this.caches[cacheName]) {
      return this.caches[cacheName];
    }
    const newCache = new CacheLru(this.options);
    this.caches[cacheName] = newCache;
    return newCache;
  }

  public setOptions(options?: ICacheLruOptions): void {
    this.options = options;
  }

  public getOptions(): ICacheLruOptions | undefined {
    return this.options;
  }
}
