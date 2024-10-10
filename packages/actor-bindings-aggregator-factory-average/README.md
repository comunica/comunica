# Comunica Bindings Aggregator Factory Average Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-bindings-aggregator-factory-average.svg)](https://www.npmjs.com/package/@comunica/actor-bindings-aggregator-factory-average)

A [bindings aggregator factory](https://github.com/comunica/comunica/tree/master/packages/bus-bindings-aggregator-factory) actor
that constructs a bindings aggregator capable of evaluating [avg](https://www.w3.org/TR/sparql11-query/#defn_aggAvg).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-bindings-aggregator-factory-average
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-bindings-aggregator-factory-average/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:bindings-aggregator-factory/actors#average",
      "@type": "ActorBindingsAggregatorFactoryAverage"
    }
  ]
}
```
