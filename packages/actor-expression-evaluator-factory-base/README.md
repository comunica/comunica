# Comunica Base Expression Evaluator Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-expression-evaluator-factory-base.svg)](https://www.npmjs.com/package/@comunica/actor-expression-evaluator-factory-base)

A comunica Base Expression Evaluator Factory Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-expression-evaluator-factory-base
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-expression-evaluator-factory-base/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:expression-evaluator-factory/actors#base",
      "@type": "ActorExpressionEvaluatorFactoryBase"
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: a MediatorQueryOperation.
* `mediatorBindingsAggregatorFactory`: a MediatorBindingsAggregatorFactory, required to evaluate aggregate expressions.
* `mediatorFunctions`: a MediatorFunctions, required to evaluate function expression
