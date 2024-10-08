# Comunica Optional Nested Loop RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-optional-nestedloop.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-optional-nestedloop)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that left-joins (optional) 2 streams using the nested loop join algorithm.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-optional-nestedloop
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-optional-nestedloop/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#optional-nestedloop",
      "@type": "ActorRdfJoinOptionalNestedLoop",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
