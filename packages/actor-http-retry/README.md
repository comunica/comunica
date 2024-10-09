# Comunica Retry HTTP Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-http-retry.svg)](https://www.npmjs.com/package/@comunica/actor-http-retry)

An [HTTP](https://github.com/comunica/comunica/tree/master/packages/bus-http) actor that performs simple request retries.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-http-retry
```

## Configure

After installing, this package can be added to your engine's configuration as follows:

```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-http-retry/^3.0.0/components/context.jsonld"
  ],
  "actors": [
    {
      "@id": "urn:comunica:default:http/actors#retry",
      "@type": "ActorHttpRetry"
    }
  ]
}
```

### Context Parameters

* `KeysHttp.httpRetryCount`: The number of retries, added on top of the initial attempt.
* `KeysHttp.httpRetryDelayFallback`: The fallback retry delay in milliseconds, if a server does not send a `Retry-After` header.
* `KeysHttp.httpRetryDelayLimit`: The optional upper limit of the retry delay in milliseconds. If a server requests a delay larger than this, the engine will consider it unavailable.
