# Comunica Inner Multi Smallest Filter Bindings RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-inner-multi-smallest-filter-bindings.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-inner-multi-smallest-filter-bindings)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that inner-joins 2 or more streams
by joining the smallest two, and joining the result with the remaining streams by delegating back to the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join).
While joining the smallest two, the first stream is pushed down as filter into the second stream.

This actor can only work if the source of second join entry accept filtering (selector shape must allow `filterBindings`).

This corresponds to the [brTPF](https://arxiv.org/abs/1608.08148) algorithm.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-inner-multi-smallest-filter-bindings
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-inner-multi-smallest-filter-bindings/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#inner-multi-smallest-filter-bindings",
      "@type": "ActorRdfJoinMultiSmallestFilterBindings"
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `mediatorJoinEntriesSort`: A mediator over the [RDF Join Entries Sort bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-entries-sort).
* `mediatorJoin`: A mediator over the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join).
* `selectivityModifier`: Multiplier for selectivity values. _(defaults to `0.0001`)_
* `blockSize`: The maximum amount of bindings to send to the source per block. _(defaults to `64`)_
