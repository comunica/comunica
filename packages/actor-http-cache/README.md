# Comunica Cache Http Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-http-cache.svg)](https://www.npmjs.com/package/@comunica/actor-http-cache)

A comunica Cache Http Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-http-cache
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-http-cache/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:http/actors#cache",
      "@type": "ActorHttpCache",
      "cacheStorage": { "@id": "urn:comunica:default:http/cache-storage#main" },
      "mediatorHttpInvalidate": { "@id": "urn:comunica:default:http-invalidate/mediators#main" },
      "mediatorHttp": { "@id": "urn:comunica:default:http/mediators#main" }
    },
  ]
}
```

### Config Parameters

 - `cacheStorage`: An implementation of the [HttpCacheStorage](https://github.com/comunica/comunica/tree/master/packages/types/lib/IHttpCacheStorage.ts) interface.
 - `mediatorHttpInvalidate`: An mediator to invalidate the cache
 - `mediatorHttp`: A mediator for making http requests
