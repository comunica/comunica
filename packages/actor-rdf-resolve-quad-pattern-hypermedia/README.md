# Comunica Hypermedia RDF Resolve Quad Pattern Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-resolve-quad-pattern-hypermedia.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-resolve-quad-pattern-hypermedia)

An [RDF Resolve Quad Pattern](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-quad-pattern) actor that handles [hypermedia-based sources](https://comunica.dev/docs/modify/advanced/hypermedia/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-resolve-quad-pattern-hypermedia
```
## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-resolve-quad-pattern-hypermedia/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-hypermedia.json#myQuadPatternHypermediaResolver",
      "@type": "ActorRdfResolveQuadPatternHypermedia",
      "carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorRdfDereference": {
        "@id": "config-sets:resolve-hypermedia.json#mediatorRdfDereference"
      },
      "carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorMetadata": {
        "@id": "config-sets:resolve-hypermedia.json#mediatorMetadata"
      },
      "carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorMetadataExtract": {
        "@id": "config-sets:resolve-hypermedia.json#mediatorMetadataExtract"
      },
      "carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorRdfResolveHypermedia": {
        "@id": "config-sets:resolve-hypermedia.json#mediatorRdfResolveHypermedia",
        "@type": "MediatorNumberMax",
        "field": "filterFactor",
        "ignoreErrors": true,
        "cc:Mediator/bus": { "@id": "cbrrh:Bus/RdfResolveHypermedia" }
      },
      "carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorRdfResolveHypermediaLinks": {
        "@id": "config-sets:resolve-hypermedia.json#mediatorRdfResolveHypermediaLinks",
        "@type": "MediatorRace",
        "cc:Mediator/bus": { "@id": "cbrrhl:Bus/RdfResolveHypermediaLinks" }
      },
      "carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorRdfResolveHypermediaLinksQueue": {
        "@id": "config-sets:resolve-hypermedia.json#mediatorRdfResolveHypermediaLinksQueue",
        "@type": "MediatorRace",
        "cc:Mediator/bus": { "@id": "cbrrhlq:Bus/RdfResolveHypermediaLinksQueue" }
      }
    }
  ]
}
```

### Config Parameters

* `carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorRdfDereference`: A mediator over the [RDF Dereference bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-dereference).
* `carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorMetadata`: A mediator over the [RDF Metadata bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata).
* `carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorMetadataExtract`: A mediator over the [RDF Metadata Extract bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract).
* `carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorRdfResolveHypermedia`: A mediator over the [RDF Resolve Hypermedia bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia).
* `carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorRdfResolveHypermediaLinks`: A mediator over the [RDF Resolve Hypermedia Links bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia-links).
* `carrqph:Actor/RdfResolveQuadPattern/Hypermedia/mediatorRdfResolveHypermediaLinksQueue`: A mediator over the [RDF Resolve Hypermedia Links Queue bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia-links-queue).
