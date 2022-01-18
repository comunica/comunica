# Comunica Bus RDF Dereference

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-rdf-dereference.svg)](https://www.npmjs.com/package/@comunica/bus-rdf-dereference)

A bus for dereferencing a path or URL into a (generic) stream.

A base actor for dereferencing URLs to (generic) streams.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-rdf-dereference
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-dereference/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorRdfDereference:_default_bus`

## Creating actors on this bus

Actors extending [`ActorRdfDereference`](https://comunica.github.io/comunica/classes/bus_rdf_dereference.actorrdfdereference.html) are automatically subscribed to this bus.

