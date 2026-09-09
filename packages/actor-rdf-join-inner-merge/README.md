# Comunica Inner Merge RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-inner-merge.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-inner-merge)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that inner-joins two
streams that both already arrive sorted on a shared join variable, by reading each side once and always advancing
the side that is behind.

Unlike a hash join, this does not build an index over one of its inputs, so it neither blocks on a full side nor
holds more than one run of equal keys in memory. Unlike a bind join, it performs no per-binding lookup in a source.

It only applies when both entries advertise an `order` in their metadata whose leading terms are shared join
variables sorted in the same direction. No query source in this repository currently produces that metadata, so
this actor never applies unless a source is extended to declare its order.

The output stays sorted on the key that was merged on, so merge joins can be chained over a star pattern without
re-sorting in between.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-inner-merge
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-inner-merge/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#inner-merge",
      "@type": "ActorRdfJoinMerge",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" },
      "mediatorTermComparatorFactory": { "@id": "urn:comunica:default:term-comparator-factory/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `mediatorTermComparatorFactory`: A mediator over the [Term Comparator Factory bus](https://github.com/comunica/comunica/tree/master/packages/bus-term-comparator-factory), used to compare join keys following the SPARQL order semantics.
