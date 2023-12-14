# Comunica Bus Dereference

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-dereference.svg)](https://www.npmjs.com/package/@comunica/bus-dereference)

A bus for dereferencing a path or URL into a (generic) stream.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-dereference
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-dereference/^2.0.0/components/context.jsonld"`
* **Bus name**: `cbd:Bus/Dereference`

## Creating actors on this bus

Actors extending [`ActorDereference`](https://comunica.github.io/comunica/classes/_comunica_bus_dereference.ActorDereference.html) are automatically subscribed to this bus.
