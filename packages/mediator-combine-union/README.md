# Comunica Mediator Combine Union

[![npm version](https://badge.fury.io/js/%40comunica%2Fmediator-combine-union.svg)](https://www.npmjs.com/package/@comunica/mediator-combine-union)

A comunica mediator that takes the union of all actor results.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/mediator-combine-union
```

## Configure

After installing, this mediator can be instantiated as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/mediator-combine-union/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@type": "SomeActor",
      "someMediator": {
        "@id": "config-sets:rdf-dereference.json#mediatorRdfParseMediatypes",
        "@type": "MediatorCombineUnion",
        "cc:Mediator/bus": { "@id": "cbrp:Bus/RdfParse" },
        "cmcu:Mediator/CombineUnion/field": "mediaTypes"
      }
    }
  ]
}
```

### Config Parameters

* `cc:Mediator/bus`: Identifier of the bus to mediate over.
* `cmcu:Mediator/CombineUnion/field`: The field name to mediate over.

