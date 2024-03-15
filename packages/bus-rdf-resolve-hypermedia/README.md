# Comunica Bus RDF Resolve Hypermedia

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-rdf-resolve-hypermedia.svg)](https://www.npmjs.com/package/@comunica/bus-rdf-resolve-hypermedia)

A bus for handling a source based on the extracted metadata.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-rdf-resolve-hypermedia
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-resolve-hypermedia/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorRdfResolveHypermedia:_default_bus`

## Creating actors on this bus

Actors extending [`ActorRdfResolveHypermedia`](https://comunica.github.io/comunica/classes/_comunica_bus_rdf_resolve_hypermedia.ActorRdfResolveHypermedia.html) are automatically subscribed to this bus.

