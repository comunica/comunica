# Comunica Inner Multi Leapfrog RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-inner-multi-leapfrog.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-inner-multi-leapfrog)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that inner-joins three or
more streams that are all sorted on the same variable in a single pass, with a leapfrog join: a candidate key is
checked against the streams from the smallest to the largest, where a stream that is behind skips ahead to it, and a
stream that is past it proposes its own key instead. Once all streams are at the same key, their runs are emitted as a
cross product. This is one level of a leapfrog triejoin, over the variable that the streams are sorted on first.

Since a larger stream is only read at keys that all smaller ones share, a key that the smallest streams do not have in
common never reaches the larger ones, as in a chain of merge joins that starts with the smallest entries.

Unlike a chain of binary [merge joins](https://github.com/comunica/comunica/tree/master/packages/actor-rdf-join-inner-merge),
every stream skips ahead to the furthest key among all of them, so a selective stream saves reads in all others at
once, including those that a merge join further down the chain would only reach through the output of another one.
Unlike a bind join, it opens every stream once, rather than issuing a lookup per binding.

It applies to the largest group of at least three entries whose `termOrder` starts with the same variable, in
ascending order, which must not be undefined in any of them. This is the term order, as for the merge join.
The other entries are joined with the result afterwards, through the join bus. The result stays sorted on the
variable, and can skip ahead itself, so that it can take part in further merge joins.

Streams that expose `seek(target)` (`ISeekableBindingsStream`) are only asked to skip once they fell behind a few
times in a row, as a skip only pays off over a gap that is longer than a few bindings.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-inner-multi-leapfrog
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-inner-multi-leapfrog/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#inner-multi-leapfrog",
      "@type": "ActorRdfJoinMultiLeapfrog",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" },
      "mediatorJoin": { "@id": "urn:comunica:default:rdf-join/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `mediatorJoin`: A mediator over the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join), to join the entries that are not leapfrogged with the result.
