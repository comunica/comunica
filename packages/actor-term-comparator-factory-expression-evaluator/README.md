# Comunica Expression Evaluator Term Comparator Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-term-comparator-factory-expression-evaluator.svg)](https://www.npmjs.com/package/@comunica/actor-term-comparator-factory-expression-evaluator)

A [term comparator factory](https://github.com/comunica/comunica/tree/master/packages/bus-term-comparator-factory) actor
that orders terms by evaluating the `<` function of the expression evaluator in both directions.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-term-comparator-factory-expression-evaluator
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-term-comparator-factory-expression-evaluator/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:term-comparator-factory/actors#expression-evaluator",
      "@type": "ActorTermComparatorFactoryExpressionEvaluator",
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "mediatorFunctionFactory": { "@id": "urn:comunica:default:function-factory/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [query operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `mediatorFunctionFactory`: A mediator over the [function factory bus](https://github.com/comunica/comunica/tree/master/packages/bus-function-factory), required to evaluate the comparison functions.
* `mediatorMergeBindingsContext`: A mediator over the [merge bindings context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
