# Comunica Explain Query Query Process Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-process-explain-query.svg)](https://www.npmjs.com/package/@comunica/actor-query-process-explain-query)

An [Query Process](https://github.com/comunica/comunica/tree/master/packages/bus-query-process) actor
that explains the logical query plan as a query string after parsing and optimizing.
If source selection took place, source assignment on operators will be serialized as `SERVICE` clauses.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-process-explain-query
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-process-explain-query/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-process/actors#explain-query",
      "@type": "ActorQueryProcessExplainService",
      "mediatorQuerySerialize": { "@id": "urn:comunica:default:query-serialize/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorQuerySerialize`: A mediator over the [Query Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-serialize).
