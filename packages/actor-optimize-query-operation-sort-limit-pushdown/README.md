# Comunica Sort Limit Pushdown Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-sort-limit-pushdown.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-sort-limit-pushdown)

An [optimize query operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor
that tells an `ORDER BY` how many of its results will actually be read, based on the `LIMIT` and `OFFSET` above it.

Without this, `ORDER BY ?x LIMIT 10` materializes and sorts the whole solution sequence in order to return ten rows.
With the annotation, the sort can keep a buffer of only the ten smallest results seen so far.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-sort-limit-pushdown
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-sort-limit-pushdown/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#sort-limit-pushdown",
      "@type": "ActorOptimizeQueryOperationSortLimitPushdown"
    }
  ]
}
```
