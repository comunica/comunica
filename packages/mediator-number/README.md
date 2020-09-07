# Comunica Number Mediator

[![npm version](https://badge.fury.io/js/%40comunica%2Fmediator-number.svg)](https://www.npmjs.com/package/@comunica/mediator-number)

A mediator that can mediate over a single number field.
It can either choose the actor with the maximum or with the minimum value.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/mediator-number
```

## Configure

After installing, this mediator can be instantiated as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/mediator-number/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@type": "SomeActor",
      "someMediator": {
        "@id": "config-sets:sparql-queryoperators.json#mediatorQueryOperation",
        "@type": "MediatorNumberMin",
        "cmn:Mediator/Number/field": "httpRequests",
        "ignoreErrors": true,
        "cc:Mediator/bus": { "@id": "cbqo:Bus/QueryOperation" }
      }
    }
  ]
}
```

Instead of `MediatorNumberMin`, `MediatorNumberMax` could also be used to resolve to the maximum value.

### Config Parameters

* `cc:Mediator/bus`: Identifier of the bus to mediate over.
* `cmn:Mediator/Number/field`: The field name to mediate over.
* `cmn:Mediator/Number/ignoreErrors`: Optional flag to indicate if actors that throw test errors should be ignored, defaults to false.
