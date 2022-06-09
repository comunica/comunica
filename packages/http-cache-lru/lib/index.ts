import { CacheStorageLru } from './CacheStorageLru';

export { CacheLru as Cache } from './CacheLru';
export { CacheStorageLru as CacheStorage } from './CacheStorageLru';
export const caches = new CacheStorageLru();

export * from './ICacheLruOptions';
export * from './IPolicyResponse';
