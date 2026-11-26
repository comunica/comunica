# Comunica RDFJS Store RDF Update Quads Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-update-quads-rdfjs-store.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-update-quads-rdfjs-store)

An [RDF Update Quads](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-update-quads) actor
that handles [RDF/JS Stores](https://comunica.dev/docs/query/advanced/rdfjs_querying/).

RDF/JS Stores are assumed to not record empty graphs.

Stores of which quads can be counted, read, added and removed synchronously,
such as those of [N3](https://github.com/rdfjs/N3.js) and [rdf-stores](https://github.com/rubensworks/rdf-stores.js),
are changed in transactions:
the changes of an update request are only applied once all its operations succeed, and not at all if one fails.
Until then, later operations of the request read the store with the changes so far.
The changes are applied in one synchronous step,
and consecutive insertions are added together, which ordered stores of rdf-stores do as one batch.
Other stores are changed directly.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-update-quads-rdfjs-store
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-update-quads-rdfjs-store/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-update-quads/actors#rdfjs-store",
      "@type": "ActorRdfUpdateQuadsRdfJsStore"
    }
  ]
}
```
