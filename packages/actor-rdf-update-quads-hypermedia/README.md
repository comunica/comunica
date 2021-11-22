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
      "@id": "#myRdfUpdateQuadsHypermedia",
      "@type": "ActorRdfUpdateQuadsHypermedia",
      "args_mediatorRdfDereference": {
        "@id": "files-cais:config/sets/resolve-hypermedia.json#mediatorRdfDereference"
      },
      "args_mediatorMetadata": {
        "@id": "files-cais:config/sets/resolve-hypermedia.json#mediatorMetadata"
      },
      "args_mediatorMetadataExtract": {
        "@id": "files-cais:config/sets/resolve-hypermedia.json#mediatorMetadataExtract"
      },
      "args_mediatorRdfUpdateHypermedia": {
        "@id": "#mediatorRdfUpdateHypermedia",
        "@type": "MediatorRace",
        "args_bus": { "@id": "ActorRdfUpdateHypermedia:_default_bus" }
      }
    }
  ]
}
```

### Config Parameters

* `args_mediatorRdfDereference`: A mediator over the [RDF Dereference bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-dereference).
* `args_mediatorMetadata`: A mediator over the [RDF Metadata bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata).
* `args_mediatorMetadataExtract`: A mediator over the [RDF Metadata Extract bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract).
* `args_mediatorRdfUpdateHypermedia`: A mediator over the [RDF Update Hypermedia bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-update-hypermedia).
