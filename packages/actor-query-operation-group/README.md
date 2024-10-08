# Comunica Group Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-group.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-group)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles [SPARQL `GROUP BY`](https://www.w3.org/TR/sparql11-query/#groupby) operations.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-group
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-group/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-operation/actors#group",
      "@type": "ActorQueryOperationGroup",
      "mediatorQueryOperation": { "@id": "#mediatorQueryOperation" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" },
      "mediatorHashBindings": { "@id": "#mediatorHashBindings" },
      "expressionEvaluatorFactory": { "@id": "urn:comunica:default:expression-evaluator/evaluators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
* `mediatorHashBindings`: A mediator over the [Hash Bindings bus](https://github.com/comunica/comunica/tree/master/packages/bus-hash-bindings).
* `expressionEvaluatorFactory`: A factory to create an [Expression Evaluator](https://github.com/comunica/comunica/tree/master/packages/expression-evaluator);
