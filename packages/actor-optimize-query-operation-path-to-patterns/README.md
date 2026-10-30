# Comunica Path to Patterns Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-path-to-patterns.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-path-to-patterns)

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor
that rewrites possible parts of property paths into quad patterns, joins and unions.

Links become quad patterns, inverse paths swap their subject and object,
sequences become joins, and alternatives become unions.
Arbitrary-length paths, zero-or-one paths and negated paths are not handled.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-path-to-patterns
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-path-to-patterns/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#path-to-patterns",
      "@type": "ActorOptimizeQueryOperationPathToPatterns"
    }
  ]
}
```
