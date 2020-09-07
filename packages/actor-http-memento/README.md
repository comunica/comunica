# Comunica Memento HTTP Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-http-memento.svg)](https://www.npmjs.com/package/@comunica/actor-http-memento)

An [HTTP](https://github.com/comunica/comunica/tree/master/packages/bus-http) actor that
uses implements the [Memento protocol to perform time-based content negotiation](https://comunica.dev/docs/query/advanced/memento/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-http-memento
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-http-memento/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:http-memento.json#myHttpFetcher",
      "@type": "ActorHttpMemento",
      "cahm:Actor/Http/Memento/mediatorHttp": {
        "@id": "config-sets:http.json#mediatorHttp"
      },
      "beforeActor": "config-sets:http.json#myHttpFetcher"
    }
  ]
}
```

Use `beforeActor` to indicate that this actor MUST always run _before_ your default HTTP actor.

### Config Parameters

* `cahm:Actor/Http/Memento/mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
