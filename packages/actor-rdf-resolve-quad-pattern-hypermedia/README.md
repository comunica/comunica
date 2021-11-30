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
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-resolve-quad-pattern-hypermedia/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "#myQuadPatternHypermediaResolver",
      "@type": "ActorRdfResolveQuadPatternHypermedia",
      "mediatorRdfDereference": {
        "@id": "#mediatorRdfDereference"
      },
      "mediatorMetadata": {
        "@id": "#mediatorMetadata"
      },
      "mediatorMetadataExtract": {
        "@id": "#mediatorMetadataExtract"
      },
      "mediatorRdfResolveHypermedia": {
        "@id": "#mediatorRdfResolveHypermedia",
        "@type": "MediatorNumberMax",
        "field": "filterFactor",
        "ignoreErrors": true,
        "bus": { "@id": "ActorRdfResolveHypermedia:_default_bus" }
      },
      "mediatorRdfResolveHypermediaLinks": {
        "@id": "#mediatorRdfResolveHypermediaLinks",
        "@type": "MediatorRace",
        "bus": { "@id": "ActorRdfResolveHypermediaLinks:_default_bus" }
      },
      "mediatorRdfResolveHypermediaLinksQueue": {
        "@id": "#mediatorRdfResolveHypermediaLinksQueue",
        "@type": "MediatorRace",
        "bus": { "@id": "ActorRdfResolveHypermediaLinksQueue:_default_bus" }
      }
    }
  ]
}
```

### Config Parameters

* `mediatorRdfDereference`: A mediator over the [RDF Dereference bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-dereference).
* `mediatorMetadata`: A mediator over the [RDF Metadata bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata).
* `mediatorMetadataExtract`: A mediator over the [RDF Metadata Extract bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract).
* `mediatorRdfResolveHypermedia`: A mediator over the [RDF Resolve Hypermedia bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia).
* `mediatorRdfResolveHypermediaLinks`: A mediator over the [RDF Resolve Hypermedia Links bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia-links).
* `mediatorRdfResolveHypermediaLinksQueue`: A mediator over the [RDF Resolve Hypermedia Links Queue bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia-links-queue).
