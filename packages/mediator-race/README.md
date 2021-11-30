# Comunica Race Mediator

[![npm version](https://badge.fury.io/js/%40comunica%2Fmediator-race.svg)](https://www.npmjs.com/package/@comunica/mediator-race)

A mediator that picks the first actor that resolves its test.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/mediator-race
```

## Configure

After installing, this mediator can be instantiated as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/mediator-race/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@type": "SomeActor",
      "someMediator": {
        "@id": "#mediatorRdfParseHandle",
        "@type": "MediatorRace",
        "bus": { "@id": "ActorRdfParse:_default_bus" }
      }
    }
  ]
}
```

### Config Parameters

* `bus`: Identifier of the bus to mediate over.


