# Comunica Update DeleteInsert Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-update-deleteinsert.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-update-deleteinsert)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles SPARQL
[`INSERT DATA`](https://www.w3.org/TR/sparql11-update/#insertData),
[`DELETE DATA`](https://www.w3.org/TR/sparql11-update/#deleteData),
and [`DELETE/INSERT`](https://www.w3.org/TR/sparql11-update/#deleteInsert) operations.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-update-deleteinsert
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-update-deleteinsert/^4.0.0/components/context.jsonld",

    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/mediator-race/^4.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-update-quads/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-operation/actors#update-deleteinsert",
      "@type": "ActorQueryOperationUpdateDeleteInsert",
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "mediatorUpdateQuads": { "@id": "urn:comunica:default:rdf-update-quads/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `mediatorUpdateQuads`: A mediator over the [RDF Update Quads bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-update-quads).
* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
