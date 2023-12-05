# Comunica Bus RDF Join

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-rdf-join.svg)](https://www.npmjs.com/package/@comunica/bus-rdf-join)

A bus for joining bindings streams.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-rdf-join
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-join/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorRdfJoin:_default_bus`

## Creating actors on this bus

Actors extending [`ActorRdfJoin`](https://comunica.github.io/comunica/classes/_comunica_bus_rdf_join.ActorRdfJoin.html) are automatically subscribed to this bus.

