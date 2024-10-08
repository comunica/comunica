# Comunica LeftJoin Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-leftjoin.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-leftjoin)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles [SPARQL `OPTIONAL`](https://www.w3.org/TR/sparql11-query/#optionals) operations
by delegating to the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) bus.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-leftjoin
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-leftjoin/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-operation/actors#leftjoin",
      "@type": "ActorQueryOperationLeftJoin",
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "mediatorJoin": { "@id": "urn:comunica:default:rdf-join/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" },
      "expressionEvaluatorFactory": { "@id": "urn:comunica:default:expression-evaluator/evaluators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `mediatorJoin`: A mediator over the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join).
* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
* `expressionEvaluatorFactory`: A factory to create an [Expression Evaluator](https://github.com/comunica/comunica/tree/master/packages/expression-evaluator);
