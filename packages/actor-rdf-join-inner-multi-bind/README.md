# Comunica Inner Multi-way Bind RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-inner-multi-bind.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-inner-multi-bind)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that inner-joins 2 or more streams
by picking the one with the lowest cardinality,
binding each item with the remaining operations,
and recursively resolving those operations by delegating to the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).

By default, it will bind in a depth-first manner, but this can be changed to breadth-first iteration if needed.

As soon as at least one of the join entries can contain undefined values,
this actor will maintain the original join order,
and just pick the first one as the one to bind from.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-inner-multi-bind
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-inner-multi-bind/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#inner-multi-bind",
      "@type": "ActorRdfJoinMultiBind",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" },
      "mediatorJoinEntriesSort": { "@id": "urn:comunica:default:rdf-join-entries-sort/mediators#main" },
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `mediatorJoinEntriesSort`: A mediator over the [RDF Join Entries Sort bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-entries-sort).
* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
* `bindOrder`: The order in which elements should be bound. _(defaults to `depth-first`, but can also be `breadth-first`)_
* `selectivityModifier`: Multiplier for selectivity values. _(defaults to `0.0001`)_
