# Comunica Selectivity RDF Join Entries Sort Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-entries-sort-selectivity.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-entries-sort-selectivity)

An [RDF Join Entries Sort](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-entries-sort) actor
that orders join entries by increasing selectivity values,
so that the join entries that would become most selective come first.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-entries-sort-selectivity
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-entries-sort-selectivity/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join-entries-sort/actors#selectivity",
      "@type": "ActorRdfJoinEntriesSortSelectivity",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
