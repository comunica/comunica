# Comunica Term Function Sub Str Function Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-function-factory-term-function-sub-str.svg)](https://www.npmjs.com/package/@comunica/actor-function-factory-term-sub-str)

A [function factory](https://github.com/comunica/comunica/tree/master/packages/bus-function-factory) actor
that constructs a [term function](https://github.com/comunica/comunica/tree/master/packages/bus-function-factory/lib/ActorFunctionFactory.ts)
capable of evaluating the [Sub Str](https://www.w3.org/TR/sparql11-query/#func-substr) function.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-function-factory-term-sub-str
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-function-factory-term-sub-str/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:function-factory/actors#term-function-sub-str",
      "@type": "ActorFunctionFactoryTermSubStr"
    }
  ]
}
```
