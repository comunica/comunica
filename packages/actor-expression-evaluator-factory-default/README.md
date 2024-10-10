# Comunica Default Expression Evaluator Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-expression-evaluator-factory-default.svg)](https://www.npmjs.com/package/@comunica/actor-expression-evaluator-factory-default)

A [expression evaluator factory](https://github.com/comunica/comunica/tree/master/packages/bus-bindings-aggregator-factory) actor
that constructs a default expression evaluator.

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
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-expression-evaluator-factory-default/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:expression-evaluator-factory/actors#default",
      "@type": "ActorExpressionEvaluatorFactoryDefault"
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: a MediatorQueryOperation.
* `mediatorBindingsAggregatorFactory`: a MediatorBindingsAggregatorFactory, required to evaluate aggregate expressions.
* `mediatorFunctions`: a MediatorFunctions, required to evaluate function expression
