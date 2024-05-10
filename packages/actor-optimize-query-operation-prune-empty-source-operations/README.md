# Comunica Prune Empty Source Operations Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-prune-empty-source-operations.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-prune-empty-source-operations)

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor
that removes operations from the query plan that are guaranteed to produce empty results.
This actor relies on source-based cardinality metadata,
or may optionally make use of ASK queries if the source supports it.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-prune-empty-source-operations
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-prune-empty-source-operations/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#prune-empty-source-operations",
      "@type": "ActorOptimizeQueryOperationPruneEmptySourceOperations",
      "useAskIfSupported": false
    }
  ]
}
```

### Config Parameters

* `useAskIfSupported`: If true, ASK queries will be sent to the source instead of COUNT queries to check emptiness for patterns. This will only be done for sources that accept ASK queries. _(defaults to `false`)_
