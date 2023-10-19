# Comunica Bindings Aggregator Factory WildcardCount Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-bindings-aggregator-factory-wildcard-count.svg)](https://www.npmjs.com/package/@comunica/actor-bindings-aggregator-factory-wildcard-count)

A comunica bindings aggregator factory for the wildcard-count aggregator.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-bindings-aggregator-factory-wildcard-count
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-bindings-aggregator-factory-wildcard-count/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:bindings-aggregator-factory/actors#wildcard-count",
      "@type": "ActorBindingsAggregatorFactoryWildcardCount"
    }
  ]
}
```
