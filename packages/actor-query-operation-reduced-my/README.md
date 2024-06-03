# Comunica Reduced My Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-reduced-my.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-reduced-my)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles SPARQL reduced-my operations.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-reduced-my
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-reduced-my/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-operation/actors#reduced-my",
      "@type": "ActorQueryOperationReducedMy",
      "mediatorQueryOperation": { "@id": "config-sets:sparql-queryoperators.json#mediatorQueryOperation" }
    }
  ]
}
```

### Config Parameters

TODO: fill in parameters (this section can be removed if there are none)

* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
