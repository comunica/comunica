# Comunica Expression Function Coalesce Function Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-function-factory-expression-function-coalesce.svg)](https://www.npmjs.com/package/@comunica/actor-function-factory-expression-function-coalesce)

A comunica Expression Function Coalesce Function Factory Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-function-factory-expression-function-coalesce
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-function-factory-expression-function-coalesce/^3.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:function-factory/actors#expression-function-coalesce",
      "@type": "ActorFunctionFactoryExpressionFunctionCoalesce"
    }
  ]
}
```
