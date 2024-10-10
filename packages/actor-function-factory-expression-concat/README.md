# Comunica Expression Function Concat Function Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-function-factory-expression-function-concat.svg)](https://www.npmjs.com/package/@comunica/actor-function-factory-expression-concat)

A [function factory](https://github.com/comunica/comunica/tree/master/packages/bus-function-factory) actor
that constructs an [expression function](https://github.com/comunica/comunica/tree/master/packages/bus-function-factory/lib/ActorFunctionFactory.ts)
capable of evaluating the [Concat](https://www.w3.org/TR/sparql11-query/#func-concat) function.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-function-factory-expression-concat
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-function-factory-expression-concat/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:function-factory/actors#expression-function-concat",
      "@type": "ActorFunctionFactoryExpressionConcat"
    }
  ]
}
```
