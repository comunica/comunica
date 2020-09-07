# Comunica Tree SPARQL Serialize Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-sparql-serialize-tree.svg)](https://www.npmjs.com/package/@comunica/actor-sparql-serialize-tree)

A [SPARQL Serialize](https://github.com/comunica/comunica/tree/master/packages/bus-sparql-serialize) actor that serializes to a JSON tree.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-sparql-serialize-tree
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-sparql-serialize-tree/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:sparql-serializers.json#myTreeSparqlSerializer",
      "@type": "ActorSparqlSerializeTree"
    }
  ]
}
```
