# Comunica Inner Multi Index Nested Loop RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-inner-multi-index-nested-loop.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-inner-multi-index-nested-loop)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that inner-joins 2 or more streams
as an index nested loop join.

This actor only applies to sources that can look up operations synchronously (`IQuerySource#queryBindingsSynchronous`).

If all lookups are over the same source that offers integer-encoded access to its quads (`IQuerySource#getEncodedAccess`),
they are done over encoded terms, and the terms of each binding are only decoded once.
In that case, this actor can also look up unions of patterns, and zero-or-more or one-or-more paths along a single predicate,
and it does the lookup with the fewest matches first for every partial result.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-inner-multi-index-nested-loop
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-inner-multi-index-nested-loop/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#inner-multi-index-nested-loop",
      "@type": "ActorRdfJoinMultiIndexNestedLoop",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
* `lookupCost`: The cost of looking up a single bound operation, expressed in produced rows. _(defaults to `1`)_
* `encodedLookups`: If lookups over a source that offers integer-encoded access to its quads, such as an ordered [rdf-stores](https://github.com/rubensworks/rdf-stores.js) store, are done over encoded terms. _(defaults to `true`)_
* `encodedUnionAndPathLookups`: If unions of patterns and zero-or-more or one-or-more paths along a single predicate can be looked up over encoded terms, which lets this actor join them without binding them to every partial result. _(defaults to `true`)_
