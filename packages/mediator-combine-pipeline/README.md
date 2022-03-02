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
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/mediator-combine-pipeline/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@type": "SomeActor",
      "someMediator": {
        "@id": "#mediatorOptimizeQueryOperation",
        "@type": "MediatorCombinePipeline",
        "bus": { "@id": "ActorOptimizeQueryOperation:_default_bus" }
      }
    }
  ]
}
```

### Config Parameters

* `bus`: Identifier of the bus to mediate over.
* `filterErrors`: Optional flag to indicate if actors that throw test errors should be filtered out of the pipeline, defaults to false.
* `field`: Optional field to use for ordering (if the ordering strategy is chosen). Leave undefined if the test output is a number rather than an object.
* `order`: Optional strategy of ordering the pipeline (increasing or decreasing).
   * For choosing to leave the order of the pipeline unchanged, leave this undefined.
   * For choosing to order by increasing values: 'increasing'.
   * For choosing to order by decreasing values: 'decreasing'.