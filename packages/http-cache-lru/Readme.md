# http-cache-lru

An http cache following http header semantics. It implements the [Cache Interface](https://developer.mozilla.org/en-US/docs/Web/API/Cache), but it DOES NOT follow the Cache Interface specification.

## Installation

```
npm i @comunica/http-cache-lru
```

## Usage
```typescript
import fetch from "cross-fetch";
import { caches } from "@comunica/http-cache-lru";

// Set options for any cache that is opened
caches.setOptions({
  // Optionally provide an alternative fetch function
  fetch: fetch,
  // Optionally provide a settings for the LRU cache. Options are defined here:
  // https://www.npmjs.com/package/lru-cache
  lruOptions: {
    max: 1000,
  },
});

async function run() {
  const cache = await caches.open("v1");
  // Make a request
  // Logs "response1: 425.793ms"
  console.time("response1");
  const response1 = await cache.match(
    "https://httpbin.org/response-headers?cache-control=max-age%3D604800"
  );
  console.timeEnd("response1");
  // Make a request to the same location
  // Logs "response2: 1.74ms" because the response was cached
  console.time("response2");
  const response2 = await cache.match(
    "https://httpbin.org/response-headers?cache-control=max-age%3D604800"
  );
  console.timeEnd("response2");
}
run();
```

## `cahces` object
The `cahces` object is a global instance of the `CacheStorage` class. You can import the same instance of the `caches` object anywhere in your codebase by running:

```typescript
import { caches } from "@comunica/http-cache-lru";
```

## `CacheStorage` class
The `CacheStorage` class implements [CacheStorage](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage) interface, but does not implement its specification. It deviates from it in a few ways.

### `CacheStorage.match`
Throws a "Not Implemented" error. Instead of using `CacheStorage.match`, you should use `CacheStorage.open` to open a cache and run the `match` method on the cache.

### `CacheStorage.has`
Returns a Promise that resolves to true if a Cache object matching the cacheName exists. This method follows the specification.

### `CacheStorage.open`
Returns a Promise that resolves to the Cache object matching the cacheName (a new cache is created if it doesn't already exist.) This method follows the specification.

### `CacheStorage.delete`
Finds the Cache object matching the cacheName, and if found, deletes the Cache object and returns a Promise that resolves to true. If no Cache object is found, it resolves to false. This method follows the specification.

### `CacheStorage.keys`
Returns a Promise that will resolve with an array containing strings corresponding to all of the named Cache objects tracked by the CacheStorage. Use this method to iterate over a list of all the Cache objects. This method follows the specification.

## `Cache` class
The `Cache` class implements [Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache) interface, but does not implement its specification. It deviates from it in a few ways.


### `Cache.match(request, options)`
Checks the cache to see if it includes the response to the given request. If it does and the response isn't stale, it returns the response. Otherwise, it will make a fetch, cache the response, and return the response.

This method deviates from the match method defined in the normal cache interface. It is more similar to the `add` method in that it will make a request if the response is not in the cahce.

The `options` parameter is also ignored.

### `Cache.matchAll(request, options)`
Throws a "Not Implemented" error. The functionality of `matchAll` does not align with this library's goal.

### `Cache.add(request)`
Throws a "Not Implemented" error. Use the `match` method instead.

### `Cache.addAll(requests)`
Throws a "Not Implemented" error. Iterate over the requests, calling the `match` method instead.

### `Cache.put(request, response)`
Takes both a request and its response and adds it to the given cache if allowed. This method deviates from the specification in a few ways:

It has extra protections beyond the specification. For example, a response that includes the `cahce-control: no-cache` will not be stored in this library, but would be stored in a specification compliant library.

Requests with the same uri, but different headers will overwrite eachother.

### `Cache.delete(request, options)`
Finds the Cache entry whose key is the request, returning a Promise that resolves to true if a matching Cache entry is found and deleted. If no Cache entry is found, the promise resolves to false. This method follows the specification.
 
### `Cache.keys(request, options)`
Returns a Promise that resolves to an array of Cache keys. This method follows the specification.
