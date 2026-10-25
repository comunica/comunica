# Comunica Annotate Union Order Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-annotate-union-order.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-annotate-union-order)

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor that annotates every union that is an input of a join with `orderUseful`: the names of the variables that it shares with the other inputs of that join.

A union whose inputs are sorted on one of those variables can then emit its bindings in that order, so that a merge join can join it.
Unions below operators that keep the order of their input, such as `FILTER`, `BIND` and projections, and unions within such unions, are annotated as well.
[`@comunica/actor-query-operation-union-ordered`](https://github.com/comunica/comunica/tree/master/packages/actor-query-operation-union-ordered) handles the annotated unions.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-annotate-union-order
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-annotate-union-order/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#annotate-union-order",
      "@type": "ActorOptimizeQueryOperationAnnotateUnionOrder"
    }
  ]
}
```
