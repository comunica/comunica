# Comunica Inner Multi Merge RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-inner-multi-merge.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-inner-multi-merge)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that inner-joins three or
more streams that are all sorted on the same variable in a single pass.
Note that this is not a leapfrog triejoin, as it does not descend into further variables.

Unlike a chain of binary [merge joins](https://github.com/comunica/comunica/tree/master/packages/actor-rdf-join-inner-merge),
every stream skips ahead to the furthest key among all of them.

Streams that expose `seek(target)` (`ISeekableBindingsStream`) are only asked to skip once they fell behind a few
times in a row.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-inner-multi-merge
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-inner-multi-merge/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#inner-multi-merge",
      "@type": "ActorRdfJoinMultiMerge",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" },
      "mediatorJoin": { "@id": "urn:comunica:default:rdf-join/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `mediatorJoin`: A mediator over the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join), to join the entries that are not merged with the result.
