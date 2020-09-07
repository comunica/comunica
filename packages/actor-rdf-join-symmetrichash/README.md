# Comunica SymmetricHash RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-symmetrichash.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-symmetrichash)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that joins using symmetric hashing.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-symmetrichash
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-symmetrichash/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:join.json#myRdfJoinActorSymmetricHash",
      "@type": "ActorRdfJoinSymmetricHash"
    }
  ]
}
```
