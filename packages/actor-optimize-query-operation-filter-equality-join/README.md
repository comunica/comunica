# Comunica Filter Equality Join Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-filter-equality-join.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-filter-equality-join)

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor
that joins operations that are only related via an equality in a filter on a new variable,
instead of filtering their cross product.

For example, in `{ ?a ?p ?x . ?b ?q ?y . FILTER(STR(?x) = STR(?y)) }`,
both patterns bind `STR(?x)` and `STR(?y)` to a new variable, so that they are joined on it.
The filter is kept, and the new variable is projected away.

This applies to `sameTerm` calls and to equalities between `STR` calls,
as these are only true if both sides are the same term.

It skips filters that are evaluated by a source, and filters of left joins,
as these can be used in bind joins, which can not bind on the new variable.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-filter-equality-join
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-filter-equality-join/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#filter-equality-join",
      "@type": "ActorOptimizeQueryOperationFilterEqualityJoin"
    }
  ]
}
```
