# Comunica SPARQL Query Source Identify Hypermedia Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-source-identify-hypermedia-sparql.svg)](https://www.npmjs.com/package/@comunica/actor-query-source-identify-hypermedia-sparql)

A [Query Source Identify Hypermedia](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify-hypermedia) actor that handles [SPARQL endpoints](https://www.w3.org/TR/sparql11-protocol/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-source-identify-hypermedia-sparql
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-source-identify-hypermedia-sparql/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-source-identify-hypermedia/actors#sparql",
      "@type": "ActorQuerySourceIdentifyHypermediaSparql",
      "mediatorHttp": { "@id": "urn:comunica:default:http/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" },
      "mediatorQuerySerialize": { "@id": "urn:comunica:default:query-serialize/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
* `mediatorQuerySerialize`: A mediator over the [Query Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-serialize).
* `checkUrlSuffix`: If URLs ending with '/sparql' should also be considered SPARQL endpoints, defaults to `true`.
* `forceHttpGet`: If queries should be sent via HTTP GET instead of POST, defaults to `false`.
* `forceSourceType`: Forces all sources provided to be interpreted as SPARQL endpoints, defaults to `false`.
* `cacheSize`: The cache size for COUNT queries, defaults to `1024`.
* `bindMethod`: The query operation for communicating bindings, defaults to `'values'`, alt: `'union'` or `'filter'`.
* `countTimeout`: Timeout in ms of how long count queries are allowed to take. If the timeout is reached, an infinity cardinality is returned. Defaults to `3000`.
* `cardinalityCountQueries`: If count queries should be sent to obtain the cardinality of (sub)queries. If set to false, resulting cardinalities will always be considered infinity. Defaults to `true`
* `cardinalityEstimateConstruction`: If cardinality estimates for larger queries should be constructed locally from (sub)query cardinalities when possible. Defaults to `false`. If set to false, count queries will be sent for every operation at all levels.
