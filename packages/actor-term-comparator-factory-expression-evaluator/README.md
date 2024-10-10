# Comunica Inequality Functions Based Term Comparator Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-term-comparator-factory-expression-evaluator.svg)](https://www.npmjs.com/package/@comunica/actor-term-comparator-factory-expression-evaluator)

A [term comparator factory](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-update-quads) actor
that uses the evaluation of the inequality functions `<` and `=` of the expression evaluator.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-term-comparator-factory-utils-expression-evaluator
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-term-comparator-factory-expression-evaluator/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:term-comparator-factory/actors#inequality-functions-based",
      "@type": "ActorTermComparatorFactoryExpressionEvaluator"
    }
  ]
}
```

### Config Parameters

TODO: fill in parameters (this section can be removed if there are none)

* `someParam`: Description of the param
