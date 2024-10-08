# Comunica Cardinality RDF Join Entries Sort Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-entries-sort-cardinality.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-entries-sort-cardinality)

An [RDF Join Entries Sort](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-entries-sort) actor
that orders join entries by increasing cardinality.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-entries-sort-cardinality
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-entries-sort-cardinality/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join-entries-sort/actors#cardinality",
      "@type": "ActorRdfJoinEntriesSortCardinality"
    }
  ]
}
```
