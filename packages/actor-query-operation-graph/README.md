# Comunica Graph Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-graph.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-graph)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles [SPARQL `GRAPH`](https://www.w3.org/TR/sparql12-query/#defn_evalGraph) operations.

This actor implements the `evalGraph` semantics from the SPARQL specification:

- **`GRAPH <iri> { ... }`**: Pushes the IRI into all triple patterns and property paths as the graph component, then delegates evaluation to the query operation mediator.
- **`GRAPH ?var { ... }`**: Enumerates all named graphs in the dataset, evaluates the inner pattern once per graph (with the graph IRI pushed into patterns), and unions the results. Each result binding is augmented with the graph variable bound to the corresponding graph IRI.

### Graph existence checking

The SPARQL spec allows `GRAPH` to act as a graph-existence check.
For example, the query `SELECT * { GRAPH <ex:g1> { } }` will produce one empty binding
if `<ex:g1>` is a named graph in the dataset, and zero bindings otherwise.
Similarly, `GRAPH ?g { }` enumerates all named graphs, producing one binding per graph with `?g` bound.

### Relationship with quad substitution

Not all `GRAPH` operations reach this actor at runtime.
The [Quad Substitution](https://github.com/comunica/comunica/tree/master/packages/actor-optimize-query-operation-quad-substitution) optimization actor pushes `GRAPH` into quad patterns during query optimization when it is safe to do so.
This actor handles the remaining cases where substitution is unsafe (e.g., when the subtree contains `MINUS`, subqueries, or conflicting variable bindings).

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

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `mediatorRdfMetadataAccumulate`: A mediator over the [RDF Metadata Accumulate bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-accumulate).
