# Comunica Explain Physical Query Process Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-process-explain-physical.svg)](https://www.npmjs.com/package/@comunica/actor-query-process-explain-physical)

An [Query Process](https://github.com/comunica/comunica/tree/master/packages/bus-query-process) actor
that explains the physical query plan after parsing, optimizing, and evaluating.

Unlike the other explain modes, this one **executes the query**, because the plan reports what actually
happened: which physical operators ran, how many results each of them produced, and how long that took.
Two consequences follow from that:

* Explaining an update query performs the update.
* The query's results are consumed to completion, and everything that was still running once they were
  is stopped. A query that produces only part of what its operators could produce, such as one with a
  `LIMIT`, therefore leaves the operators below the limit cut short: the plan reports their output as
  `destroyed`, and `cardReal` says how far they got. How far that is depends on the order in which the
  engine happened to schedule them, so it can differ between runs of the same query.

## Output

Every node of the plan reports the logical operator, the physical operator where one applies, the actor
that ran it, its estimated cardinality (`cardEst`), the number of results it actually produced
(`cardReal`), the time spent in its own output iterator (`timeSelf`) and the time between its creation
and its end (`timeLife`).

Neither timing is a share of a total. `timeLife` spans of nested operators overlap by construction, as
an operator lives at least as long as the ones it reads from. `timeSelf` excludes the operators an
operator reads from, but an operator that hands its input's stream through unchanged is measured on that
same stream, so it reports the same `timeSelf` as the operator below it. Use both to find where time
goes, not to add up to the query's duration.

Operations that evaluate a sub-operation once per binding, such as bind joins, `EXISTS` filters and
arbitrary-length property paths, group those evaluations under a node of their own, in which identical
sub-plans are summarized as `compacted-occurrences` together with the totals they stand for.

When a source handles an operation itself, the operations it was handed are reported below it and marked
as `delegated`. SPARQL endpoints additionally report the query that was sent (`srcQuery`) and the number
of HTTP requests that were made (`httpRequests`).

Long values, such as source identifiers, actor names, and the queries sent to sources, are interned into
legends below the plan.

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
