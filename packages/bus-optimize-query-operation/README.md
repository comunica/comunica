# Comunica Bus Optimize Query Operation

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-optimize-query-operation.svg)](https://www.npmjs.com/package/@comunica/bus-optimize-query-operation)

A bus to apply optional optimizations to the SPARQL algebra before actual execution.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-optimize-query-operation
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-optimize-query-operation/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorOptimizeQueryOperation:_default_bus`

## Creating actors on this bus

Actors extending [`ActorOptimizeQueryOperation`](https://comunica.github.io/comunica/classes/_comunica_bus_optimize_query_operation.ActorOptimizeQueryOperation.html) are automatically subscribed to this bus.

