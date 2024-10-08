# Comunica Term Function Seconds Function Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-function-factory-term-function-seconds.svg)](https://www.npmjs.com/package/@comunica/actor-function-factory-term-function-seconds)

A comunica Term Function Seconds Function Factory Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-function-factory-term-function-seconds
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-function-factory-term-function-seconds/^3.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:function-factory/actors#term-function-seconds",
      "@type": "ActorFunctionFactoryTermFunctionSeconds"
    }
  ]
}
```
