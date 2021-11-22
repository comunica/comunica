# Comunica Qpf RDF Resolve Quad Pattern Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-resolve-quad-pattern-qpf.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-resolve-quad-pattern-qpf)

An [RDF Resolve Hypermedia](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia) actor
that handles [Triple Pattern Fragments](https://linkeddatafragments.org/specification/triple-pattern-fragments/)
and [Quad Pattern Fragments](https://linkeddatafragments.org/specification/quad-pattern-fragments/) interfaces.
It sends triple/quad pattern queries to the interfaces and follows next-page links.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-resolve-quad-pattern-qpf
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-resolve-quad-pattern-qpf/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "#myHypermediaQpfResolver",
      "@type": "ActorRdfResolveHypermediaQpf",
      "args_mediatorRdfDereference": {
        "@id": "#mediatorRdfDereference",
        "@type": "MediatorRace",
        "args_bus": { "@id": "ActorRdfDereference:_default_bus" }
      },
      "args_mediatorMetadata": {
        "@id": "#mediatorMetadata",
        "@type": "MediatorRace",
        "args_bus": { "@id": "ActorRdfMetadata:_default_bus" }
      },
      "argsmediatorMetadataExtract": {
        "@id": "#mediatorMetadataExtract",
        "@type": "MediatorCombineUnion",
        "args_bus": { "@id": "ActorRdfMetadataExtract:_default_bus" },
        "args_field": "metadata"
      }
    }
  ]
}
```

### Config Parameters

* `args_mediatorRdfDereference`: A mediator over the [RDF Dereference bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-dereference).
* `args_mediatorMetadata`: A mediator over the [RDF Metadata bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata).
* `args_mediatorMetadataExtract`: A mediator over the [RDF Metadata Extract bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract).
