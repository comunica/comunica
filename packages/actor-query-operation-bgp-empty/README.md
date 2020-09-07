# Comunica BGP Empty Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-bgp-empty.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-bgp-empty)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles empty [SPARQL Basic Graph Patterns](https://www.w3.org/TR/sparql11-query/#BasicGraphPatterns).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-bgp-empty
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-bgp-empty/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:sparql-queryoperators.json#myEmptyBgpQueryOperator",
      "@type": "ActorQueryOperationBgpEmpty"
    }
  ]
}
```
