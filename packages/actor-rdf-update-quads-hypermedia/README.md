# Comunica Hypermedia RDF Update Quads Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-update-quads-hypermedia.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-update-quads-hypermedia)

An [RDF Update Quads](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-update-quads) actor
that handles [hypermedia-based destinations](https://comunica.dev/docs/modify/advanced/hypermedia/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-update-quads-hypermedia
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-update-quads-hypermedia/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-update-quads/actors#hypermedia",
      "@type": "ActorRdfUpdateQuadsHypermedia",
      "mediatorDereferenceRdf": { "@id": "urn:comunica:default:dereference-rdf/mediators#main" },
      "mediatorMetadata": { "@id": "urn:comunica:default:rdf-metadata/mediators#main" },
      "mediatorMetadataExtract": { "@id": "urn:comunica:default:rdf-metadata-extract/mediators#main" },
      "mediatorRdfUpdateHypermedia": { "@id": "urn:comunica:default:rdf-update-hypermedia/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorDereferenceRdf`: A mediator over the [RDF Dereference bus](https://github.com/comunica/comunica/tree/master/packages/bus-dereference-rdf).
* `mediatorMetadata`: A mediator over the [RDF Metadata bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata).
* `mediatorMetadataExtract`: A mediator over the [RDF Metadata Extract bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract).
* `mediatorRdfUpdateHypermedia`: A mediator over the [RDF Update Hypermedia bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-update-hypermedia).
