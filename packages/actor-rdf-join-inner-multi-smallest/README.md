# Comunica Inner Multi-way Smallest RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-inner-multi-smallest.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-inner-multi-smallest)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that inner-joins 3 or more streams
by joining the smallest two, and joining the result with the remaining streams by delegating back to the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-inner-multi-smallest
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-inner-multi-smallest/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#inner-multi-smallest",
      "@type": "ActorRdfJoinMultiSmallest",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" },
      "mediatorJoinEntriesSort": { "@id": "urn:comunica:default:rdf-join-entries-sort/mediators#main" },
      "mediatorJoin": { "@id": "urn:comunica:default:rdf-join/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `mediatorJoinEntriesSort`: A mediator over the [RDF Join Entries Sort bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-entries-sort).
* `mediatorJoin`: A mediator over the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join).
