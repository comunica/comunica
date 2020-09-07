# Comunica Join Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-join.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-join)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles SPARQL Join operations
by delegating to the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) bus.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-join
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-join/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:sparql-queryoperators.json#myJoinQueryOperator",
      "@type": "ActorQueryOperationJoin",
      "cbqo:mediatorQueryOperation": { "@id": "config-sets:sparql-queryoperators.json#mediatorQueryOperation" },
      "caqoj:mediatorJoin": { "@id": "config-sets:sparql-queryoperators.json#mediatorRdfJoin" }
    }
  ]
}
```


### Config Parameters

* `cbqo:mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `caqoj:mediatorJoin`: A mediator over the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join).

