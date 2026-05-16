# Comunica Graph Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-graph.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-graph)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
that handles SPARQL [GRAPH](https://www.w3.org/TR/sparql11-query/#namedGraphs) operations.

This actor implements the `evalGraph` semantics from the SPARQL specification:
- For `GRAPH <iri> { ... }`: evaluates the inner operation against the specified named graph.
- For `GRAPH ?var { ... }`: enumerates all named graphs, evaluates the inner operation per-graph,
  binds the graph variable, and unions all results.

This actor handles GRAPH operations that were NOT optimized away by the
[Quad Substitution optimizer](https://github.com/comunica/comunica/tree/master/packages/actor-optimize-query-operation-quad-substitution).
These include cases with MINUS, GROUP/aggregation, or VALUES without patterns,
where quad substitution would produce incorrect results.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-graph
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-graph/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-operation/actors#graph",
      "@type": "ActorQueryOperationGraph",
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "mediatorRdfMetadataAccumulate": { "@id": "urn:comunica:default:rdf-metadata-accumulate/mediators#main" }
    }
  ]
}
```
