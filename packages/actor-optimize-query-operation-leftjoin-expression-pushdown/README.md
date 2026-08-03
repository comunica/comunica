# Comunica LeftJoin Expression Pushdown Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-leftjoin-expression-pushdown.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-leftjoin-expression-pushdown)

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor
that pushes down expressions in left joins into either the left-hand or right-hand operator
if it overlaps with just one of them.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-leftjoin-expression-pushdown
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-leftjoin-expression-pushdown/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#leftjoin-expression-pushdown",
      "@type": "ActorOptimizeQueryOperationLeftjoinExpressionPushdown"
    }
  ]
}
```
