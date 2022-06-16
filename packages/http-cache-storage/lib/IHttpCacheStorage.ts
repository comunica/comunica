import type * as CachePolicy from 'http-cache-semantics';

export interface IHttpCacheStorageValue {
  policy: CachePolicy;
  response: Response;
}

export interface IHttpCacheStorage {
  set: (key: Request, value: IHttpCacheStorageValue, ttl?: number) => Promise<void>;
  get: (key: Request) => Promise<IHttpCacheStorageValue | undefined>;
  delete: (key: Request) => Promise<boolean>;
  clear: () => Promise<void>;
  has: (key: Request) => Promise<boolean>;
}
