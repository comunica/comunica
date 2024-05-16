# Comunica Sequential Query Process Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-process-sequential.svg)](https://www.npmjs.com/package/@comunica/actor-query-process-sequential)

An [Query Process](https://github.com/comunica/comunica/tree/master/packages/bus-query-process) actor
that processes a query in a sequential manner.
It first parses the query, optimizes it, and then evaluates it.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-process-sequential
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-process-sequential/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-process/actors#sequential",
      "@type": "ActorQueryProcessSequential",
      "mediatorContextPreprocess": { "@id": "urn:comunica:default:context-preprocess/mediators#main" },
      "mediatorQueryParse": { "@id": "urn:comunica:default:query-parse/mediators#main" },
      "mediatorOptimizeQueryOperation": { "@id": "urn:comunica:default:optimize-query-operation/mediators#main" },
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorContextPreprocess`: A mediator over the [context preprocess bus](https://github.com/comunica/comunica/tree/master/packages/bus-context-preprocess).
* `mediatorSparqlParse`: A mediator over the [query parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-parse).
* `mediatorOptimizeQueryOperation`: A mediator over the [optimize query operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation).
* `mediatorQueryOperation`: A mediator over the [query operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
