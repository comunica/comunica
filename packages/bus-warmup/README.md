# Comunica Bus Warmup

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-warmup.svg)](https://www.npmjs.com/package/@comunica/bus-warmup)

A bus for warming up a query engine before it handles actual queries,
so that the just-in-time compiler has optimized the engine by then.
Actors on this bus receive the engine, the maximum number of query executions and duration,
and a signal to stop early, and may for example execute queries over the sources in the context.
Once the signal is aborted, they should not start new query executions.
They must not modify the sources.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-warmup
```

## Usage

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-warmup/^5.0.0/components/context.jsonld"`
* **Bus name**: `ActorWarmup:_default_bus`

## Creating actors on this bus

Actors extending [`ActorWarmup`](https://comunica.github.io/comunica/classes/_comunica_bus_warmup.ActorWarmup.html) are automatically subscribed to this bus.
