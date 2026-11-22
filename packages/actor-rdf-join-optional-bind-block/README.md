# Comunica Optional Bind Block RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-optional-bind-block.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-optional-bind-block)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that left-joins (optional) 2 streams using a bind join over blocks of bindings,
for second operations that do not have a single source, such as an operation over multiple SPARQL endpoints.

It joins each block of bindings of the first stream with the second operation as an inner join of `VALUES` with that operation,
which is planned like any other join, so that each source of the second operation can receive the block,
and adds the bindings of the block that have no results.
If the second operation is a union, such as for a pattern over multiple sources, the block is joined with each of its branches,
so that a branch with a single source can receive the block in one request.
Each row of the `VALUES` has a row number, so that results are assigned to the bindings that produced them.

Bindings with the same values for the variables of the second operation have the same results,
so a block only holds their distinct values, at most `blockSize` of them (and at most `maxBlockBindings` bindings).
Bindings with a blank node for one of these variables have no results, as blank nodes can not be passed to another source.

Second operations with a single source are left to the [Optional Bind Source RDF Join Actor](https://github.com/comunica/comunica/tree/master/packages/actor-rdf-join-optional-bind-source),
which passes blocks to that source directly.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-optional-bind-block
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-optional-bind-block/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#optional-bind-block",
      "@type": "ActorRdfJoinOptionalBindBlock",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" },
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `selectivityModifier`: Multiplier for selectivity values. _(defaults to `0.000001`)_
* `blockSize`: The maximum amount of distinct values of the variables of the second operation per block. _(defaults to `64`)_
* `maxBlockBindings`: The maximum amount of bindings per block, which may share their values for these variables. _(defaults to `1024`)_
