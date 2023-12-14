# Comunica Bus RDF Resolve Quad Pattern

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-rdf-resolve-quad-pattern.svg)](https://www.npmjs.com/package/@comunica/bus-rdf-resolve-quad-pattern)

A bus for translating a quad pattern into a stream of quad.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-rdf-resolve-quad-pattern
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-resolve-quad-pattern/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorRdfResolveQuadPattern:_default_bus`

## Creating actors on this bus

Actors extending [`ActorRdfResolveQuadPattern`](https://comunica.github.io/comunica/classes/_comunica_bus_rdf_resolve_quad_pattern.ActorRdfResolveQuadPattern.html) are automatically subscribed to this bus.

[`ActorRdfResolveQuadPatternSource`](https://comunica.github.io/comunica/classes/_comunica_bus_rdf_resolve_quad_pattern.ActorRdfResolveQuadPatternSource.html) is an extension of `ActorRdfResolveQuadPattern`
that delegates quad pattern stream creation to an [`IQuadSource`](https://comunica.github.io/comunica/interfaces/_comunica_bus_rdf_resolve_quad_pattern.IQuadSource.html).

