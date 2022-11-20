import type * as CachePolicy from 'http-cache-semantics';

export interface IHttpCacheStorageValue<BodyType extends BodyInit = BodyInit> {
  policy: CachePolicy;
  body?: BodyType;
  init?: ResponseInit;
}

export interface IHttpCacheStorage<BodyType extends BodyInit = BodyInit> {
  set: (key: Request, value: IHttpCacheStorageValue<BodyType>, ttl?: number) => Promise<void>;
  get: (key: Request) => Promise<IHttpCacheStorageValue<BodyType> | undefined>;
  delete: (key: Request) => Promise<boolean>;
  clear: () => Promise<void>;
  has: (key: Request) => Promise<boolean>;
}
