# Comunica Bus SPARQL Serialize

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-sparql-serialize.svg)](https://www.npmjs.com/package/@comunica/bus-sparql-serialize)

A bus for serializing the query result into a text-based serialization.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-sparql-serialize
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-sparql-serialize/^1.0.0/components/context.jsonld"`
* **Bus name**: `cbss:Bus/SparqlSerialize`

## Creating actors on this bus

Actors extending [`ActorSparqlSerialize`](https://comunica.github.io/comunica/classes/bus_sparql_serialize.actorsparqlserialize.html) are automatically subscribed to this bus.

