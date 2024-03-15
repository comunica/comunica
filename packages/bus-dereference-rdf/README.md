# Comunica Bus RDF Dereference

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-dereference-rdf.svg)](https://www.npmjs.com/package/@comunica/bus-dereference-rdf)

A bus for dereferencing a path or URL into a stream of quads.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-dereference-rdf
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-dereference-rdf/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorDereferenceRdf:_default_bus`

## Creating actors on this bus

Actors extending [`ActorDereferenceRdf`](https://comunica.github.io/comunica/classes/_comunica_bus_dereference_rdf.ActorDereferenceRdf.html) are automatically subscribed to this bus.

