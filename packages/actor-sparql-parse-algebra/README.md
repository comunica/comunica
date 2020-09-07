# Comunica Algebra SPARQL Parse Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-sparql-parse-algebra.svg)](https://www.npmjs.com/package/@comunica/actor-sparql-parse-algebra)

A [SPARQL Parse](https://github.com/comunica/comunica/tree/master/packages/bus-sparql-parse) actor that handles [SPARQL queries](https://www.w3.org/TR/sparql11-query/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-sparql-parse-algebra
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-sparql-parse-algebra/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:sparql-parsers.json#mySparqlParser",
      "@type": "ActorSparqlParseAlgebra"
    }
  ]
}
```
