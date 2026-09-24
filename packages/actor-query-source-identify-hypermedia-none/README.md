# Comunica None Query Source Identify Hypermedia Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-source-identify-hypermedia-none.svg)](https://www.npmjs.com/package/@comunica/actor-query-source-identify-hypermedia-none)

A [Query Source Identify Hypermedia](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify-hypermedia) actor that handles raw RDF files.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-source-identify-hypermedia-none
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-source-identify-hypermedia-none/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-source-identify-hypermedia/actors#none",
      "@type": "ActorQuerySourceIdentifyHypermediaNone",
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
* `mediatorTermComparatorFactory`: An optional mediator over the [Term Comparator Factory bus](https://github.com/comunica/comunica/tree/master/packages/bus-term-comparator-factory).
  If set, files are loaded into an [rdf-stores](https://github.com/rubensworks/rdf-stores.js) store with ordered indexes (`GPSO`, `GPOS`, `GOSP`),
  which keep their quads in the order of the created comparator.
  Scans of such a store report that order in their metadata, and can skip ahead within it, which the merge join makes use of.
  If not set, files are loaded into a default store, whose scans have no order.
