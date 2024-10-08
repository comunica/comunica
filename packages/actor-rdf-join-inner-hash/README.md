# Comunica Inner Hash RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-inner-hash.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-inner-hash)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that inner-joins using hashing.
Depending on how this actor is configured, it either does or does not support streams that can have undefined values.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-inner-hash
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-inner-hash/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#inner-hash",
      "@type": "ActorRdfJoinHash",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" },
      "mediatorHashBindings": { "@id": "urn:comunica:default:hash-bindings/mediators#main" },
      "canHandleUndefs": true
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `mediatorHashBindings`: A mediator over the [Hash Bindings bus](https://github.com/comunica/comunica/tree/master/packages/bus-hash-bindings).
* `canHandleUndefs`: If this actor can handle undefined values. If false, performance will be slightly better.
