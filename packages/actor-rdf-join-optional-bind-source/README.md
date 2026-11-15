# Comunica Optional Bind Source RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-optional-bind-source.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-optional-bind-source)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that left-joins (optional) 2 streams using a bind join that passes bindings to the source in blocks.
It sends each block of bindings of the first stream to the source of the second operation, together with that operation,
and adds the bindings of the block that have no results.
This requires the second operation to have a single source that accepts join bindings, such as a SPARQL endpoint.

Bindings with the same values for the variables of the second operation have the same results,
so the source only receives the distinct values of these variables,
and a block holds the bindings of at most `blockSize` distinct values (and at most `maxBlockBindings` bindings).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-optional-bind-source
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-optional-bind-source/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#optional-bind-source",
      "@type": "ActorRdfJoinOptionalBindSource",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `selectivityModifier`: Multiplier for selectivity values. _(defaults to `0.000001`)_
* `blockSize`: The maximum amount of distinct values of the variables of the second operation to send to the source per request. _(defaults to `16`)_
* `maxBlockBindings`: The maximum amount of bindings per request, which may share their values for these variables. _(defaults to `1024`)_
