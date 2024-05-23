# Comunica Query Source Identify Context Preprocess Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-context-preprocess-query-source-identify.svg)](https://www.npmjs.com/package/@comunica/actor-context-preprocess-query-source-identify)

An [Context Preprocess](https://github.com/comunica/comunica/tree/master/packages/bus-context-preprocess) actor
that identifies all query sources in the context using
the [Query Source Identify bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify).

This actor also contains a cache so that identical sources will be reused across multiple query executions.
This cache can be invalidated via `engine.invalidateHttpCache()`.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-context-preprocess-query-source-identify
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-context-preprocess-query-source-identify/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:context-preprocess/actors#query-source-identify",
      "@type": "ActorContextPreprocessQuerySourceIdentify",
      "mediatorQuerySourceIdentify": { "@id": "urn:comunica:default:query-source-identify/mediators#main" },
      "mediatorContextPreprocess": { "@id": "urn:comunica:default:context-preprocess/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `cacheSize`: The maximum number of entries in the LRU cache, set to 0 to disable, defaults to 100.
* `httpInvalidator`: An optional actor that listens to HTTP invalidation events.
* `mediatorQuerySourceIdentify`: A mediator over the [Query Source Identify bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify).
* `mediatorContextPreprocess`: A mediator over the [context preprocess bus](https://github.com/comunica/comunica/tree/master/packages/bus-context-preprocess).
