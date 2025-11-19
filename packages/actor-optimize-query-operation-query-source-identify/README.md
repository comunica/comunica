# Comunica Query Source Identify Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-query-source-identify.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-query-source-identify)

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor
that identifies all query sources in the context using
the [Query Source Identify bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify).
It will store all query sources in the context using `KeysQueryOperation.querySources`,
and sources corresponding to the SERVICE clauses within the query will be stored
using `KeysQueryOperation.serviceSources`.

This actor also contains a cache so that identical sources will be reused across multiple query executions.
This cache can be invalidated via `engine.invalidateHttpCache()`.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-query-source-identify
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-query-source-identify/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#query-source-identify",
      "@type": "ActorOptimizeQueryOperationQuerySourceIdentify",
      "mediatorQuerySourceIdentify": { "@id": "urn:comunica:default:query-source-identify/mediators#main" },
      "mediatorContextPreprocess": { "@id": "urn:comunica:default:context-preprocess/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `serviceForceSparqlEndpoint`: Optional flag indicating if the SERVICE target should be assumed to be a SPARQL endpoint, defaults to `false`.
* `cacheSize`: The maximum number of entries in the LRU cache, set to 0 to disable, defaults to 100.
* `httpInvalidator`: An optional actor that listens to HTTP invalidation events.
* `mediatorQuerySourceIdentify`: A mediator over the [Query Source Identify bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify).
* `mediatorContextPreprocess`: A mediator over the [context preprocess bus](https://github.com/comunica/comunica/tree/master/packages/bus-context-preprocess).
