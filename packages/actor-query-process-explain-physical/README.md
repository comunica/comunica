# Comunica Explain Physical Query Process Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-process-explain-physical.svg)](https://www.npmjs.com/package/@comunica/actor-query-process-explain-physical)

An [Query Process](https://github.com/comunica/comunica/tree/master/packages/bus-query-process) actor
that explains the physical query plan after parsing, optimizing, and evaluating.

This mode **executes the query**, as the plan reports what actually ran, so explaining an update
performs it. Operators below one that stops early, such as a `LIMIT`, are cut short: they report as
`destroyed`, and how far they got can differ between runs.

## Output

Every node reports its logical and physical operator, the actor that ran it, its estimated (`cardEst`)
and actual (`cardReal`) cardinality, the time in its own output iterator (`timeSelf`) and the time
until it ended (`timeLife`). Neither timing adds up to a total: nested operators overlap, and an
operator that passes its input's stream through unchanged reports the same `timeSelf` as the one below
it.

Operations that evaluate a sub-operation per binding, such as bind joins, `EXISTS` filters and
arbitrary-length property paths, group those evaluations under a node of their own, in which identical
sub-plans are summarized as `compacted-occurrences`.

When a source handles an operation itself, the operations it was handed are reported below it as
`delegated`. SPARQL endpoints also report the query they sent (`srcQuery`) and how many HTTP requests
they made (`httpRequests`). Long values are interned into legends below the plan.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-process-explain-physical
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-process-explain-physical/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-process/actors#explain-physical",
      "@type": "ActorQueryProcessExplainPhysical"
    }
  ]
}
```
