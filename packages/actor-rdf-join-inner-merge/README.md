# Comunica Inner Merge RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-inner-merge.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-inner-merge)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that inner-joins two
streams that both already arrive sorted on a shared join variable, by reading each side once and always advancing
the side that is behind.

Unlike a hash join, this does not build an index over one of its inputs, so it neither blocks on a full side nor
holds more than one run of equal keys in memory. Unlike a bind join, it performs no per-binding lookup in a source.

It only applies when both entries advertise a `termOrder` in their metadata whose leading terms are shared join
variables sorted in the same direction. That is the term order (see `compareTerms` in
[`@comunica/utils-iterator`](https://github.com/comunica/comunica/tree/master/packages/utils-iterator)), which
compares terms on term type, value, datatype, language, and base direction, and in which two terms are equal exactly
if they are equal RDF terms. It is not the SPARQL order of the `order` metadata, which this actor does not use.
Sources declare it in the metadata of the bindings they produce, when they produce them in that order.

The output stays sorted on the key that was merged on, so merge joins can be chained over a star pattern without
re-sorting in between.

Sources may additionally expose a `seek(target)` method on the bindings stream they return
(`ISeekableBindingsStream`), which skips past every remaining binding preceding `target` in the stream's declared
term order. A merge join spends most of its time advancing whichever side is behind, so a source that can descend an
index or binary-search a sorted array turns that scan into a jump. On a selective join this changes how much of the
larger side is read at all: joining 6 bindings against 447k read 566 bindings with `seek` instead of 447,539
without it.

Comparing in the term order only compares strings, where the SPARQL order would have to interpret literals
(~0.04us against ~0.6us per comparison).

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
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
