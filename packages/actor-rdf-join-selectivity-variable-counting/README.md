# Comunica Variable Counting RDF Join Selectivity Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-selectivity-variable-counting.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-selectivity-variable-counting)

An [RDF Join Selectivity](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity) actor
that heuristically tries to estimate the selectivity of joins by counting the overlap of variables and non-variables
in patterns.

Based on the _"variable counting predicates"_ heuristic from
[_Stocker, Markus, et al. "SPARQL basic graph pattern optimization using selectivity estimation." Proceedings of the 17th international conference on World Wide Web. 2008._](https://www.semanticscholar.org/paper/SPARQL-basic-graph-pattern-optimization-using-Stocker-Seaborne/da4d7bf764d918f6dfb2b285dfc3e12da7b62b00).
Implementation inspired by http://www.docjar.com/docs/api/com/hp/hpl/jena/sparql/engine/optimizer/heuristic/VariableCountingUnbound.html.
This algorithm is extended to also support non-triple-pattern operations and quads.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-selectivity-variable-counting
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-selectivity-variable-counting/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join-selectivity/actors#variable-counting",
      "@type": "ActorRdfJoinSelectivityVariableCounting"
    }
  ]
}
```
