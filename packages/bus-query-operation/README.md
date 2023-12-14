# Comunica Bus Query Operation

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-query-operation.svg)](https://www.npmjs.com/package/@comunica/bus-query-operation)

A bus for evaluating [SPARQL algebra operations](https://comunica.dev/docs/modify/advanced/algebra/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-query-operation
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-query-operation/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorQueryOperation:_default_bus`

## Creating actors on this bus

Actors extending [`ActorQueryOperation`](https://comunica.github.io/comunica/classes/_comunica_bus_query_operation.ActorQueryOperation.html) or [`ActorQueryOperationTyped`](https://comunica.github.io/comunica/classes/_comunica_bus_query_operation.ActorQueryOperationTyped.html) are automatically subscribed to this bus.

It is recommended to extend from `ActorQueryOperationTyped` if your actor supports a single query operation,
as the bus will be able to handle this actor more efficiently.
This is not applicable if your actor handles multiple different types of query operations.
