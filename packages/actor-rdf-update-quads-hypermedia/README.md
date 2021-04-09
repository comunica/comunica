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
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-update-quads-hypermedia/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:rdf-update-rdfjs.json#myRdfUpdateQuadsHypermedia",
      "@type": "ActorRdfUpdateQuadsHypermedia",
      "caruqh:Actor/RdfUpdateQuads/Hypermedia/mediatorRdfDereference": {
        "@id": "config-sets:resolve-hypermedia.json#mediatorRdfDereference"
      },
      "caruqh:Actor/RdfUpdateQuads/Hypermedia/mediatorMetadata": {
        "@id": "config-sets:resolve-hypermedia.json#mediatorMetadata"
      },
      "caruqh:Actor/RdfUpdateQuads/Hypermedia/mediatorMetadataExtract": {
        "@id": "config-sets:resolve-hypermedia.json#mediatorMetadataExtract"
      },
      "caruqh:Actor/RdfUpdateQuads/Hypermedia/mediatorRdfUpdateHypermedia": {
        "@id": "config-sets:rdf-update-rdfjs.json#mediatorRdfUpdateHypermedia",
        "@type": "MediatorRace",
        "cc:Mediator/bus": { "@id": "cbruh:Bus/RdfUpdateHypermedia" }
      }
    }
  ]
}
```

### Config Parameters

* `caruqh:Actor/RdfUpdateQuads/Hypermedia/mediatorRdfDereference`: A mediator over the [RDF Dereference bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-dereference).
* `caruqh:Actor/RdfUpdateQuads/Hypermedia/mediatorMetadata`: A mediator over the [RDF Metadata bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata).
* `caruqh:Actor/RdfUpdateQuads/Hypermedia/mediatorMetadataExtract`: A mediator over the [RDF Metadata Extract bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract).
* `caruqh:Actor/RdfUpdateQuads/Hypermedia/mediatorRdfUpdateHypermedia`: A mediator over the [RDF Update Hypermedia bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-update-hypermedia).
