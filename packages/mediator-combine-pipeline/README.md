# Comunica Mediator Sequential

[![npm version](https://badge.fury.io/js/%40comunica%2Fmediator-sequential.svg)](https://www.npmjs.com/package/@comunica/mediator-sequential)

A comunica mediator that goes over all actors in sequence and forwards I/O.
This requires the action input and the actor output to be of the same type.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/mediator-sequential
```

## Configure

After installing, this mediator can be instantiated as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/mediator-combine-pipeline/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@type": "SomeActor",
      "someMediator": {
        "@id": "config-sets:sparql-init.json#mediatorOptimizeQueryOperation",
        "@type": "MediatorCombinePipeline",
        "cc:Mediator/bus": { "@id": "cboqo:Bus/OptimizeQueryOperation" }
      }
    }
  ]
}
```

### Config Parameters

* `cc:Mediator/bus`: Identifier of the bus to mediate over.

