# Comunica Proxy Http Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-http-proxy.svg)](https://www.npmjs.com/package/@comunica/actor-http-proxy)

An [HTTP](https://github.com/comunica/comunica/tree/master/packages/bus-http) actor that
can [redirect HTTP actions through a proxy](https://comunica.dev/docs/query/advanced/proxying/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-http-proxy
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-http-proxy/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:http/actors#proxy",
      "@type": "ActorHttpProxy",
      "mediatorHttp": { "@id": "urn:comunica:default:http/mediators#main" },
      "beforeActors": { "@id": "urn:comunica:default:http/actors#fetch" }
    }
  ]
}
```

Use `beforeActors` to indicate that this actor MUST always run _before_ your default HTTP actor.

### Config Parameters

* `mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
