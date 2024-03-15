# Comunica Bus RDF Resolve Hypermedia Links

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-rdf-resolve-hypermedia-links.svg)](https://www.npmjs.com/package/@comunica/bus-rdf-resolve-hypermedia-links)

A bus for determining which links should be followed from the metadata of the current source.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-rdf-resolve-hypermedia-links
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-resolve-hypermedia-links/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorRdfResolveHypermediaLinks:_default_bus`

## Creating actors on this bus

Actors extending [`ActorRdfresolveHypermediaLinks`](https://comunica.github.io/comunica/classes/_comunica_bus_rdf_resolve_hypermedia_links.ActorRdfresolveHypermediaLinks.html) are automatically subscribed to this bus.

