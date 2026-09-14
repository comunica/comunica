# Comunica Expressions Init Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-expressions.svg)](https://www.npmjs.com/package/@comunica/actor-init-expressions)

An [Init](https://github.com/comunica/comunica/tree/master/packages/bus-init) actor that exposes the mediators
needed to evaluate SPARQL expressions, which `ExpressionEngineBase` wraps into an `IExpressionEngine`.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-init-expressions
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-init-expressions/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:init/actors#expressions",
      "@type": "ActorInitExpressions",
      "mediatorExpressionEvaluatorFactory": { "@id": "urn:comunica:default:expression-evaluator-factory/mediators#main" },
      "mediatorTermComparatorFactory": { "@id": "urn:comunica:default:term-comparator-factory/mediators#main" },
      "mediatorBindingsAggregatorFactory": { "@id": "urn:comunica:default:bindings-aggregator-factory/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorExpressionEvaluatorFactory`: A mediator over the [expression evaluator factory bus](https://github.com/comunica/comunica/tree/master/packages/bus-expression-evaluator-factory).
* `mediatorTermComparatorFactory`: A mediator over the [term comparator factory bus](https://github.com/comunica/comunica/tree/master/packages/bus-term-comparator-factory).
* `mediatorBindingsAggregatorFactory`: A mediator over the [bindings aggregator factory bus](https://github.com/comunica/comunica/tree/master/packages/bus-bindings-aggregator-factory).
