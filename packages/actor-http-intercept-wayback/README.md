# Comunica Wayback Http Intercept Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-http-intercept-wayback.svg)](https://www.npmjs.com/package/@comunica/actor-http-intercept-wayback)

A Comunica actor to intercept HTTP requests to recover broken links using the WayBack  Machine

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-http-intercept-wayback
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-http-intercept-wayback/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:http-intercept/actors#wayback",
      "@type": "ActorHttpInterceptWayback",
      "mediatorHttp": { "@id": "urn:comunica:default:http/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
