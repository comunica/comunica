# Comunica SPARQL Query Serialize Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-serialize-sparql.svg)](https://www.npmjs.com/package/@comunica/actor-query-serialize-sparql)

A [Query Serialize](https://github.com/comunica/comunica/tree/master/packages/bus-query-serialize) actor that handles [SPARQL queries](https://www.w3.org/TR/sparql11-query/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-serialize-sparql
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-serialize-sparql/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-serialize/actors#sparql",
      "@type": "ActorQuerySerializeSparql"
    }
  ]
}
```
