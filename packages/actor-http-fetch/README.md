# Comunica Fetch HTTP Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-http-fetch.svg)](https://www.npmjs.com/package/@comunica/actor-http-fetch)

An [HTTP](https://github.com/comunica/comunica/tree/master/packages/bus-http) actor that
uses [fetch](https://fetch.spec.whatwg.org/) to perform HTTP requests.

When this actor is used in Node.js, a memory-based cache will be initialized.
This cache is only used when the `httpCache` context flag is enabled.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

When this actor is used, a custom fetch implementation may be provided via the context (`fetch`).
If none is provided, the global `fetch` implementation from the runtime or a polyfill is used.

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-http-fetch
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-http-fetch/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    {
      "@id": "urn:comunica:default:http/actors#fetch",
      "@type": "ActorHttpFetch"
    }
  ]
}
```

### Config Parameters

* `cacheMaxSize`: Maximum size of the cache (in bytes). Defaults to `104857600` (100MB).
* `cacheMaxCount`: Maximum number of documents to store in the cache. Defaults to `1000`.
* `cacheMaxEntrySize`: Maximum size of an entry in the cache (in bytes). Defaults to `5242880` (5MB).
* `httpInvalidator`: A mediator over the [HTTP invalidate bus](https://github.com/comunica/comunica/tree/master/packages/bus-http-invalidate).
* `agentOptions`: The agent JSON options for the HTTP agent in Node.js environments. _(optional)_
