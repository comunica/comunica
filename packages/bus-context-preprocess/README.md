# Comunica Bus Context Preprocess

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-context-preprocess.svg)](https://www.npmjs.com/package/@comunica/bus-context-preprocess)

A bus in which actors can optionally modify the [query context](https://comunica.dev/docs/query/advanced/context/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-context-preprocess
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-context-preprocess/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorContextPreprocess:_default_bus`

## Creating actors on this bus

Actors extending [`ActorContextPreprocess`](https://comunica.github.io/comunica/classes/_comunica_bus_context_preprocess.ActorContextPreprocess.html) are automatically subscribed to this bus.
