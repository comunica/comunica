# Comunica Mediator Join Coefficients Fixed

[![npm version](https://badge.fury.io/js/%40comunica%2Fmediator-join-coefficients-fixed.svg)](https://www.npmjs.com/package/@comunica/mediator-join-coefficients-fixed)

A mediator that mediates over actors implementing the [Join Coefficients mediator type](https://github.com/comunica/comunica/tree/master/packages/mediatortype-join-coefficients).
Based on the produced join coefficients,
the mediator calculates an overal join cost based on several configurable weights,
and picks the actor with the lowest overall cost.
This is meant to be used for mediation over the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join).

For example, on machines where I/O and memory is very expensive,
this mediator's parameters could be tweaked so that the weight of I/O and memory are higher,
so that they lead to a higher cost for actors that require more I/O and memory usage.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/mediator-join-coefficients-fixed
```

## Configure

After installing, this mediator can be instantiated as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/mediator-all/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@type": "SomeActor",
      "someMediator": {
        "@id": "config-sets:sparql-queryoperators.json#mediatorRdfJoin",
        "@type": "MediatorJoinCoefficientsFixed",
        "cmjcf:Mediator/JoinCoefficientsFixed#cpuWeight": 1,
        "cmjcf:Mediator/JoinCoefficientsFixed#memoryWeight": 1,
        "cmjcf:Mediator/JoinCoefficientsFixed#timeWeight": 1,
        "cmjcf:Mediator/JoinCoefficientsFixed#ioWeight": 0.01,
        "cc:Mediator/bus": { "@id": "cbrj:Bus/RdfJoin" }
      }
    }
  ]
}
```

### Config Parameters

* `"cmjcf:Mediator/JoinCoefficientsFixed#cpuWeight"`: Weight for the CPU cost. Higher values lead to higher overall costs.
* `"cmjcf:Mediator/JoinCoefficientsFixed#memoryWeight"`: Weight for the memory cost. Higher values lead to higher overall costs.
* `"cmjcf:Mediator/JoinCoefficientsFixed#timeWeight"`: Weight for the execution time cost. Higher values lead to higher overall costs.
* `"cmjcf:Mediator/JoinCoefficientsFixed#ioWeight"`: Weight for the I/O cost. Higher values lead to higher overall costs.
* `cc:Mediator/bus`: Identifier of the bus to mediate over.

