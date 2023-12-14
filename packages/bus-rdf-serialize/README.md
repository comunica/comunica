# Comunica Bus RDF Serialize

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-rdf-serialize.svg)](https://www.npmjs.com/package/@comunica/bus-rdf-serialize)

A bus for serializing quads to an RDF serialization format.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-rdf-serialize
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-serialize/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorRdfSerialize:_default_bus`

## Creating actors on this bus

Actors extending [`ActorRdfSerialize`](https://comunica.github.io/comunica/classes/_comunica_bus_rdf_serialize.ActorRdfSerialize.html) are automatically subscribed to this bus.

