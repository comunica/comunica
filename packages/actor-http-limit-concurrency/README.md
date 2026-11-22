# Comunica HTTP Concurrency Limit Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-http-limit-concurrency.svg)](https://www.npmjs.com/package/@comunica/actor-http-limit-concurrency)

An [HTTP](https://github.com/comunica/comunica/tree/master/packages/bus-http) actor that limits the number of concurrent requests per host,
once the host signals that it is overloaded.

Hosts differ widely in how many concurrent requests they handle well,
so requests are not limited, apart from `maxLimit`, until a host signals overload:
a `429` or `503` response, or a request that failed without response, such as on a lost connection.
The limit then becomes half the number of requests that were in flight, similar to TCP congestion control,
and grows by one per limit's worth of successful requests, up to `maxLimit`.
Requests beyond the limit wait for a free slot, in the order they were sent.
Requests that time out or are aborted by the client do not count as overload.

A request takes up its slot until its response headers arrive, not until its body is read,
as consumers may only read a body after other requests to the same host completed.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-http-limit-concurrency
```

## Configure

After installing, this package can be added to your engine's configuration as follows:

```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-http-limit-concurrency/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    {
      "@id": "urn:comunica:default:http/actors#limit-concurrency",
      "@type": "ActorHttpLimitConcurrency",
      "mediatorHttp": { "@id": "urn:comunica:default:http/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
* `maxLimit`: The maximum number of concurrent requests per host. Defaults to `10000`.
