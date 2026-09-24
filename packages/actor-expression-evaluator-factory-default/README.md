# Comunica Default Expression Evaluator Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-expression-evaluator-factory-default.svg)](https://www.npmjs.com/package/@comunica/actor-expression-evaluator-factory-default)

An [expression evaluator factory](https://github.com/comunica/comunica/tree/master/packages/bus-expression-evaluator-factory) actor
that constructs the default expression evaluator.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-expression-evaluator-factory-default
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-expression-evaluator-factory-default/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:expression-evaluator-factory/actors#default",
      "@type": "ActorExpressionEvaluatorFactoryDefault",
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "mediatorFunctionFactory": { "@id": "urn:comunica:default:function-factory/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [query operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation), required to evaluate `EXISTS`.
* `mediatorFunctionFactory`: A mediator over the [function factory bus](https://github.com/comunica/comunica/tree/master/packages/bus-function-factory), required to evaluate function expressions.
* `mediatorMergeBindingsContext`: A mediator over the [merge bindings context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context), used to create the bindings that `EXISTS` is evaluated against.
