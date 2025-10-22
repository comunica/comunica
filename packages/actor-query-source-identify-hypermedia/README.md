# Comunica Hypermedia Query Source Identify Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-source-identify-hypermedia.svg)](https://www.npmjs.com/package/@comunica/actor-query-source-identify-hypermedia)

A [Query Source Identify](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify) actor that handles [hypermedia-based sources](https://comunica.dev/docs/modify/advanced/hypermedia/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-source-identify-hypermedia
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-source-identify-hypermedia/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-source-identify/actors#hypermedia",
      "@type": "ActorQuerySourceIdentifyHypermedia",
      "mediatorMetadataAccumulate": { "@id": "urn:comunica:default:rdf-metadata-accumulate/mediators#main" },
      "mediatorQuerySourceDereferenceLink": { "@id": "urn:comunica:default:query-source-dereference-link/mediators#main" },
      "mediatorRdfResolveHypermediaLinks": { "@id": "urn:comunica:default:rdf-resolve-hypermedia-links/mediators#main" },
      "mediatorRdfResolveHypermediaLinksQueue": { "@id": "urn:comunica:default:rdf-resolve-hypermedia-links-queue/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `cacheSize`: The maximum number of entries in the LRU cache, set to 0 to disable, defaults to 100.
* `maxIterators`: The maximum number of links that can be followed in parallel, defaults to 64.
* `mediatorMetadataAccumulate`: A mediator over the [RDF Metadata Accumulate bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-accumulate).
* `mediatorQuerySourceDereferenceLink`: A mediator over the [Query Source Hypermedia Resolve bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-dereference-link).
* `mediatorRdfResolveHypermediaLinks`: A mediator over the [RDF Resolve Hypermedia Links bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia-links).
* `mediatorRdfResolveHypermediaLinksQueue`: A mediator over the [RDF Resolve Hypermedia Links Queue bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia-links-queue).
* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
