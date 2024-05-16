# Comunica Bus Query Process

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-query-process.svg)](https://www.npmjs.com/package/@comunica/bus-query-process)

A bus for fully processing a query.
This usually involves parsing, optimizing, and evaluating, which can be delegated to other buses.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-query-process
```

## Usage

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-query-process/^1.0.0/components/context.jsonld"`
* **Bus name**: `ActorQueryProcess:_default_bus`

## Creating actors on this bus

Actors extending [`ActorQueryProcess`](https://comunica.github.io/comunica/classes/bus_query_process.actorqueryprocess.html) are automatically subscribed to this bus.
