# Comunica Wayback Http Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-http-wayback.svg)](https://www.npmjs.com/package/@comunica/actor-http-wayback)

An [HTTP](https://github.com/comunica/comunica/tree/master/packages/bus-http) actor
that intercepts HTTP requests to recover broken links using the [WayBack Machine](https://web.archive.org/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-http-wayback
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-http-wayback/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:http/actors#wayback",
      "@type": "ActorHttpWayback",
      "mediatorHttp": { "@id": "urn:comunica:default:http/mediators#no-fallback" }
    }
  ]
}
```

### Config Parameters

* `mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
