# Comunica Term Function Unary Minus Function Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-function-factory-term-function-unary-minus.svg)](https://www.npmjs.com/package/@comunica/actor-function-factory-term-unary-minus)

A [function factory](https://github.com/comunica/comunica/tree/master/packages/bus-function-factory) actor
that constructs a [term function](https://github.com/comunica/comunica/tree/master/packages/bus-function-factory/lib/ActorFunctionFactory.ts)
capable of evaluating the [Unary Minus](https://www.w3.org/TR/sparql11-query/#OperatorMapping) function.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-function-factory-term-unary-minus
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-function-factory-term-unary-minus/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:function-factory/actors#term-function-unary-minus",
      "@type": "ActorFunctionFactoryTermUnaryMinus"
    }
  ]
}
```
