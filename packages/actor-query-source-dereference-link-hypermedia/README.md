# Comunica Dereference Query Source Hypermedia Resolve Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-source-dereference-link-hypermedia.svg)](https://www.npmjs.com/package/@comunica/actor-query-source-dereference-link-hypermedia)

A [Query Source Dereference Link](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-dereference-link) actor that resolves links as [hypermedia-based sources](https://comunica.dev/docs/modify/advanced/hypermedia/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-source-dereference-link-hypermedia
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-source-dereference-link-hypermedia/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-source-dereference-link/actors#dereference",
      "@type": "ActorQuerySourceDereferenceLinkHypermedia",
      "mediatorDereferenceRdf": { "@id": "urn:comunica:default:dereference-rdf/mediators#main" },
      "mediatorMetadata": { "@id": "urn:comunica:default:rdf-metadata/mediators#main" },
      "mediatorMetadataExtract": { "@id": "urn:comunica:default:rdf-metadata-extract/mediators#main" },
      "mediatorMetadataAccumulate": { "@id": "urn:comunica:default:rdf-metadata-accumulate/mediators#main" },
      "mediatorQuerySourceIdentifyHypermedia": { "@id": "urn:comunica:default:query-source-identify-hypermedia/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorDereferenceRdf`: A mediator over the [Dereference RDF bus](https://github.com/comunica/comunica/tree/master/packages/bus-dereference-rdf).
* `mediatorMetadata`: A mediator over the [Metadata bus](https://github.com/comunica/comunica/tree/master/packages/bus-metadata).
* `mediatorMetadataExtract`: A mediator over the [Metadata Extract bus](https://github.com/comunica/comunica/tree/master/packages/bus-metadata-extract).
* `mediatorMetadataAccumulate`: A mediator over the [Metadata Accumulatebus](https://github.com/comunica/comunica/tree/master/packages/bus-metadata-accumulate).
* `mediatorQuerySourceIdentifyHypermedia`: A mediator over the [Query Source Identify Hypermedia bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify-hypermedia).
