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
      "@id": "#myQuadPatternHypermediaResolver",
      "@type": "ActorRdfResolveQuadPatternHypermedia",
      "args_mediatorRdfDereference": {
        "@id": "#mediatorRdfDereference"
      },
      "args_mediatorMetadata": {
        "@id": "#mediatorMetadata"
      },
      "args_mediatorMetadataExtract": {
        "@id": "#mediatorMetadataExtract"
      },
      "args_mediatorRdfResolveHypermedia": {
        "@id": "#mediatorRdfResolveHypermedia",
        "@type": "MediatorNumberMax",
        "field": "filterFactor",
        "ignoreErrors": true,
        "args_bus": { "@id": "ActorRdfResolveHypermedia:_default_bus" }
      },
      "args_mediatorRdfResolveHypermediaLinks": {
        "@id": "#mediatorRdfResolveHypermediaLinks",
        "@type": "MediatorRace",
        "args_bus": { "@id": "ActorRdfResolveHypermediaLinks:_default_bus" }
      },
      "args_mediatorRdfResolveHypermediaLinksQueue": {
        "@id": "#mediatorRdfResolveHypermediaLinksQueue",
        "@type": "MediatorRace",
        "args_bus": { "@id": "ActorRdfResolveHypermediaLinksQueue:_default_bus" }
      }
    }
  ]
}
```

### Config Parameters

* `args_mediatorRdfDereference`: A mediator over the [RDF Dereference bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-dereference).
* `args_mediatorMetadata`: A mediator over the [RDF Metadata bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata).
* `args_mediatorMetadataExtract`: A mediator over the [RDF Metadata Extract bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract).
* `args_mediatorRdfResolveHypermedia`: A mediator over the [RDF Resolve Hypermedia bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia).
* `args_mediatorRdfResolveHypermediaLinks`: A mediator over the [RDF Resolve Hypermedia Links bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia-links).
* `args_mediatorRdfResolveHypermediaLinksQueue`: A mediator over the [RDF Resolve Hypermedia Links Queue bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia-links-queue).
