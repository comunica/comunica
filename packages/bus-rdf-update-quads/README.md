# Comunica Bus RDF Update Quads

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-rdf-update-quads.svg)](https://www.npmjs.com/package/@comunica/bus-rdf-update-quads)

A bus for inserting and deleting stream of quads.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-rdf-update-quads
```

## Usage

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-update-quads/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorRdfUpdateQuads:_default_bus`

## Creating actors on this bus

Actors extending [`ActorRdfUpdateQuads`](https://comunica.github.io/comunica/classes/_comunica_bus_rdf_update_quads.ActorRdfUpdateQuads.html) are automatically subscribed to this bus.

[`ActorRdfUpdateQuadsDestination`](https://comunica.github.io/comunica/classes/_comunica_bus_rdf_update_quads.ActorRdfUpdateQuadsDestination.html) is an extension of `ActorRdfUpdateQuads`
that delegates insert and delete streams to an [`IQuadDestination`](https://comunica.github.io/comunica/interfaces/_comunica_bus_rdf_update_quads.IQuadDestination.html).
