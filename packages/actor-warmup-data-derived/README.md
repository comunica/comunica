# Comunica Data Derived Warmup Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-warmup-data-derived.svg)](https://www.npmjs.com/package/@comunica/actor-warmup-data-derived)

A [Warmup](https://github.com/comunica/comunica/tree/master/packages/bus-warmup) actor
that warms up the engine with queries derived from the data in the sources, and not from any particular workload.

It samples predicates, subjects, and their links from the sources,
and derives single patterns, stars, and paths from them, all with a limit.
It then executes these queries in turn, and serializes their results like a SPARQL endpoint does,
until it reaches the maximum number of executions or duration, or until the signal is aborted.
The duration starts once the queries are derived, so loading the sources does not count towards it.
An aborted signal also stops sampling the sources.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-warmup-data-derived
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-warmup-data-derived/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:warmup/actors#data-derived",
      "@type": "ActorWarmupDataDerived"
    }
  ]
}
```

### Config Parameters

* `executions`: The number of query executions if the action does not determine it, defaults to `2000`.
