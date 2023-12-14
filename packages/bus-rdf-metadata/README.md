# Comunica Bus RDF Metadata

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-rdf-metadata.svg)](https://www.npmjs.com/package/@comunica/bus-rdf-metadata)

A bus for extracting the quads relevant for metadata from the stream of data quads.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-rdf-metadata
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-metadata/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorRdfMetadata:_default_bus`

## Creating actors on this bus

Actors extending [`ActorRdfMetadata`](https://comunica.github.io/comunica/classes/_comunica_bus_rdf_metadata.ActorRdfMetadata.html) are automatically subscribed to this bus.

