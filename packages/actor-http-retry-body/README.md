# Comunica Retry HTTP Body Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-http-retry-body.svg)](https://www.npmjs.com/package/@comunica/actor-http-retry-body)

An [HTTP](https://github.com/comunica/comunica/tree/master/packages/bus-http) actor that retries response body streams that error mid-read.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-http-retry-body
```

## Configure

After installing, this package can be added to your engine's configuration as follows:

```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-http-retry-body/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    {
      "@id": "urn:comunica:default:http/actors#retry-body",
      "@type": "ActorHttpRetryBody"
    }
  ]
}
```

### Context Parameters

* `KeysHttp.httpRetryBodyCount`: The number of retries when a response body stream errors mid-read. Responses are buffered until complete.
* `KeysHttp.httpRetryBodyDelayFallback`: The fallback retry delay in milliseconds between body retries.
* `KeysHttp.httpRetryBodyAllowUnsafe`: Allow body retries for non-idempotent methods or non-replayable request bodies.
* `KeysHttp.httpRetryBodyMaxBytes`: Maximum number of bytes to buffer per attempt. When exceeded, body retries are disabled and the response continues streaming as-is.
