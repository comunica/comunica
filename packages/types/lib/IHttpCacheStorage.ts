import type * as CachePolicy from 'http-cache-semantics';

// TODO: This should be `BodyType extends BodyInit = BodyInit`,
// but Components.js cannot recognize BodyInit. Replace when Components.js
// has a fix
export interface IHttpCacheStorageValue<BodyType = any> {
  policy: CachePolicy;
  body?: BodyType;
  init?: ResponseInit;
}

// TODO: This should be `BodyType extends BodyInit = BodyInit`,
// but Components.js cannot recognize BodyInit. Replace when Components.js
// has a fix
export interface IHttpCacheStorage<BodyType = any> {
  set: (key: Request, value: IHttpCacheStorageValue<BodyType>, ttl?: number) => Promise<void>;
  get: (key: Request) => Promise<IHttpCacheStorageValue<BodyType> | undefined>;
  delete: (key: Request) => Promise<boolean>;
  clear: () => Promise<void>;
  has: (key: Request) => Promise<boolean>;
}
