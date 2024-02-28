# Comunica QPF Query Source Identify Hypermedia Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-source-identify-hypermedia-qpf.svg)](https://www.npmjs.com/package/@comunica/actor-query-source-identify-hypermedia-qpf)

A [Query Source Identify Hypermedia](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify-hypermedia) actor
that handles [Triple Pattern Fragments](https://linkeddatafragments.org/specification/triple-pattern-fragments/),
[Quad Pattern Fragments](https://linkeddatafragments.org/specification/quad-pattern-fragments/),
and [bindings-restricted Triple Pattern Fragments](https://arxiv.org/abs/1608.08148) interfaces.
It sends triple/quad pattern queries to the interfaces and follows next-page links.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-source-identify-hypermedia-qpf
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-source-identify-hypermedia-qpf/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-source-identify-hypermedia/actors#qpf",
      "@type": "ActorQuerySourceIdentifyHypermediaQpf",
      "mediatorDereferenceRdf": { "@id": "urn:comunica:default:dereference-rdf/mediators#main" },
      "mediatorMetadata": { "@id": "urn:comunica:default:rdf-metadata/mediators#main" },
      "mediatorMetadataExtract": { "@id": "urn:comunica:default:rdf-metadata-extract/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorDereferenceRdf`: A mediator over the [RDF Dereference bus](https://github.com/comunica/comunica/tree/master/packages/bus-dereference-rdf).
* `mediatorMetadata`: A mediator over the [RDF Metadata bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata).
* `mediatorMetadataExtract`: A mediator over the [RDF Metadata Extract bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract).
* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
