# Comunica Filter Pushdown Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-filter-pushdown.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-filter-pushdown)

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor
that pushes down filter expressions into the query plan as deep as possible.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-filter-pushdown
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-filter-pushdown/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#filter-pushdown",
      "@type": "ActorOptimizeQueryOperationFilterPushdown"
    }
  ]
}
```

### Config Parameters

* `aggressivePushdown`: If filters should be pushed down as deep as possible. If false, filters will only be pushed down if the source(s) accept them, or if the filter is very selective. _(defaults to `false`)_
* `maxIterations`: The maximum number of full iterations across the query can be done for attempting to push down filters. _(defaults to `10`)_
* `splitConjunctive`: If conjunctive filters should be split into nested filters before applying filter pushdown. This can enable pushing down deeper. _(defaults to `true`)_
* `mergeConjunctive`: If nested filters should be merged into conjunctive filters after applying filter pushdown. _(defaults to `true`)_
* `pushIntoLeftJoins`: If filters should be pushed into left-joins. _(defaults to `false`)_
* `pushEqualityIntoPatterns`: If simple equality filters should be pushed into patterns and paths. This only applies to equality filters with terms that are not literals that have no canonical lexical form. _(defaults to `true`)_
