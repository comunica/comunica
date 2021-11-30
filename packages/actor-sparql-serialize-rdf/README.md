# Comunica RDF SPARQL Serialize Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-sparql-serialize-rdf.svg)](https://www.npmjs.com/package/@comunica/actor-sparql-serialize-rdf)

A [SPARQL Serialize](https://github.com/comunica/comunica/tree/master/packages/bus-sparql-serialize) actor that serializes to RDF by delegating to the [RDF Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-sparql-serialize-rdf
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-sparql-serialize-rdf/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "#myRdfSparqlSerializer",
      "@type": "ActorSparqlSerializeRdf",
      "args_mediatorRdfSerialize": {
        "@id": "#mediatorRdfSerialize",
        "@type": "MediatorRace",
        "args_bus": { "@id": "ActorRdfSerialize:_default_bus" }
      },
      "args_mediatorMediaTypeCombiner": {
        "@id": "#mediatorRdfSerializeMediatypes",
        "@type": "MediatorCombineUnion",
        "args_bus": { "@id": "ActorRdfSerialize:_default_bus" },
        "args_field": "mediaTypes"
      },
      "args_mediatorMediaTypeFormatCombiner": {
        "@type": "MediatorCombineUnion",
        "args_bus": { "@id": "ActorRdfSerialize:_default_bus" },
        "args_field": "mediaTypeFormats"
      }
    },
  ]
}
```

### Config Parameters

* `args_mediatorRdfSerialize`: A mediator over the [RDF Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) for actual serialization.
* `args_mediatorRdfSerializeMediaTypeCombiner`: A mediator over the [RDF Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) for collecting media types.
* `args_mediatorRdfSerializeMediaTypeFormatCombiner`: A mediator over the [RDF Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) for collecting media type formats.
