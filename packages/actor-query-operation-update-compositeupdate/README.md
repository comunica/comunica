# Comunica Update CompositeUpdate Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-update-compositeupdate.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-update-compositeupdate)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles
a composition of multiple [SPARQL UPDATE operations](https://www.w3.org/TR/sparql11-update/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-update-compositeupdate
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-update-compositeupdate/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:sparql-queryoperator-update.json#myCompositeUpdateOperator",
      "@type": "ActorQueryOperationUpdateCompositeUpdate",
      "cbqo:mediatorQueryOperation": { "@id": "config-sets:sparql-queryoperators.json#mediatorQueryOperation" }
    }
  ]
}
```

### Config Parameters

* `cbqo:mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
