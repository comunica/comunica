# Comunica Distinct Identity Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-distinct-identity.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-distinct-identity)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles [SPARQL `DISTINCT`](https://www.w3.org/TR/sparql11-query/#sparqlDistinct) operations
by maintaining a identity-based cache of infinite size.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-distinct-identity
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-distinct-identity/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-operation/actors#distinct",
      "@type": "ActorQueryOperationDistinctIdentity",
      "mediatorQueryOperation": { "@id": "#mediatorQueryOperation" },
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
