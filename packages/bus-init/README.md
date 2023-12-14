# Comunica Bus Init

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-init.svg)](https://www.npmjs.com/package/@comunica/bus-init)

A bus from which all Comunica engines start.
This is where they accept generic input parameters, such as CLI arguments.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-init
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-init/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorInit:_default_bus`

## Creating actors on this bus

Actors extending [`ActorInit`](https://comunica.github.io/comunica/classes/_comunica_bus_init.ActorInit.html) are automatically subscribed to this bus.

