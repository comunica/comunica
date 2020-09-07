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
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-sparql-serialize-rdf/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:sparql-serializers.json#myRdfSparqlSerializer",
      "@type": "ActorSparqlSerializeRdf",
      "cassr:Actor/SparqlSerialize/Rdf/mediatorRdfSerialize": {
        "@id": "config-sets:sparql-serializers.json#mediatorRdfSerialize",
        "@type": "MediatorRace",
        "cc:Mediator/bus": { "@id": "cbrs:Bus/RdfSerialize" }
      },
      "cassr:Actor/SparqlSerialize/Rdf/mediatorRdfSerializeMediaTypeCombiner": {
        "@type": "MediatorCombineUnion",
        "cc:Mediator/bus": { "@id": "cbrs:Bus/RdfSerialize" },
        "cmcu:Mediator/CombineUnion/field": "mediaTypes"
      },
      "cassr:Actor/SparqlSerialize/Rdf/mediatorRdfSerializeMediaTypeFormatCombiner": {
        "@type": "MediatorCombineUnion",
        "cc:Mediator/bus": { "@id": "cbrs:Bus/RdfSerialize" },
        "cmcu:Mediator/CombineUnion/field": "mediaTypeFormats"
      }
    },
  ]
}
```

### Config Parameters

* `cassr:Actor/SparqlSerialize/Rdf/mediatorRdfSerialize`: A mediator over the [RDF Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) for actual serialization.
* `cassr:Actor/SparqlSerialize/Rdf/mediatorRdfSerializeMediaTypeCombiner`: A mediator over the [RDF Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) for collecting media types.
* `cassr:Actor/SparqlSerialize/Rdf/mediatorRdfSerializeMediaTypeFormatCombiner`: A mediator over the [RDF Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) for collecting media type formats.
