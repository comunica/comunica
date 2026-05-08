# Comunica Quad Substitution Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-quad-substitution.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-quad-substitution)

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor
that pushes GRAPH operations into quad patterns when it is safe to do so.

### Safety checks

`GRAPH <iri> { ... }` is pushed down only when every solution-producing leaf in the inner
operation is a default-graph pattern or path. This ensures that pushing the graph IRI into
patterns implicitly enforces graph-existence semantics. If any leaf is uncovered (e.g., an
empty BGP, VALUES, or a branch in a UNION without patterns), the `GRAPH` wrapper is preserved
so the runtime actor can verify graph existence before evaluation.

`GRAPH ?var { ... }` is only pushed down when the above coverage check passes **and**
the subtree does **not** contain:
- **MINUS** — pushing the graph variable into both sides of MINUS would change variable disjointness semantics.
- **PROJECT** (subquery boundary) — pushing the graph variable into a subquery can change implicit grouping behavior.
- **VALUES** that binds the graph variable — would conflict with the pushed-down variable.
- **EXTEND** that binds the graph variable — would conflict with the pushed-down variable.

Inner `GRAPH` and `SERVICE` operations create their own scope and are not checked.

When substitution is unsafe, the `GRAPH` operator is preserved in the algebra and handled at runtime
by the [Graph Query Operation Actor](https://github.com/comunica/comunica/tree/master/packages/actor-query-operation-graph).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-quad-substitution
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-quad-substitution/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#quad-substitution",
      "@type": "ActorOptimizeQueryOperationQuadSubstitution"
    }
  ]
}
```
