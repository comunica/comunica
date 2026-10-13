# Comunica Union Ordered Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-union-ordered.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-union-ordered)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles [SPARQL `UNION`](https://www.w3.org/TR/sparql11-query/#alternatives) operations, and keeps the term order that its inputs share.

It only handles unions that [`@comunica/actor-optimize-query-operation-annotate-union-order`](https://github.com/comunica/comunica/tree/master/packages/actor-optimize-query-operation-annotate-union-order) annotated with `orderUseful`: the variables that the union shares with the other inputs of the join it is in.
Other unions are left to [`@comunica/actor-query-operation-union`](https://github.com/comunica/comunica/tree/master/packages/actor-query-operation-union), which this actor must be placed before with `beforeActors`.

When all inputs report a `termOrder` with a common prefix that starts with one of those variables, the union emits its bindings in that order and reports it, so that a merge join can join it, and forwards seeks to its inputs.
Otherwise, it reads its inputs in turn.
The order is decided on when the metadata is first requested, and dropped if reading started before that.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-union-ordered
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-union-ordered/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-operation/actors#union-ordered",
      "@type": "ActorQueryOperationUnionOrdered",
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "mediatorRdfMetadataAccumulate": { "@id": "urn:comunica:default:rdf-metadata-accumulate/mediators#main" },
      "beforeActors": { "@id": "urn:comunica:default:query-operation/actors#union" }
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `mediatorRdfMetadataAccumulate`: A mediator over the [RDF Metadata Accumulate bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-accumulate).
