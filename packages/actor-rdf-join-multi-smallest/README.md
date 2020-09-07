# Comunica Multi Smallest RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-multi-smallest.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-multi-smallest)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that joins 3 or more streams
by joining the smallest two, and joining the result with the remaining streams by delegating back to the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-multi-smallest
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-multi-smallest/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:join.json#myRdfJoinMultiActor",
      "@type": "ActorRdfJoinMultiSmallest",
      "carjms:mediatorJoin": { "@id": "config-sets:sparql-queryoperators.json#mediatorRdfJoin" }
    }
  ]
}
```

### Config Parameters

* `carjms:mediatorJoin`: A mediator over the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join).
