# Comunica Inner Multi Index Nested Loop RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-inner-multi-index-nested-loop.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-inner-multi-index-nested-loop)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that inner-joins 2 or more streams
by evaluating one entry, and looking up each of the other entries, which must be quad patterns, bound to each of its bindings.

Unlike the bind join, the order of the lookups is determined once,
and bound patterns are passed to their source directly, instead of being planned again for every binding.
This actor only applies to sources that can look up quad patterns synchronously (`IQuerySource#queryBindingsSynchronous`),
such as indexed in-memory stores, as indicated by the `synchronous` flag in their selector shape.

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
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `lookupCost`: The cost of looking up a single bound pattern, expressed in produced rows. _(defaults to `1`)_
