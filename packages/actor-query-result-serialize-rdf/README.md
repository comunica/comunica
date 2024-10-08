# Comunica RDF Query Result Serialize Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-result-serialize-rdf.svg)](https://www.npmjs.com/package/@comunica/actor-query-result-serialize-rdf)

A [Query Result Serialize](https://github.com/comunica/comunica/tree/master/packages/bus-query-result-serialize) actor that serializes to RDF by delegating to the [RDF Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-result-serialize-rdf
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-result-serialize-rdf/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-result-serialize/actors#rdf",
      "@type": "ActorQueryResultSerializeRdf",
      "mediatorRdfSerialize": { "@id": "urn:comunica:default:rdf-serialize/mediators#serialize" },
      "mediatorMediaTypeCombiner": { "@id": "urn:comunica:default:rdf-serialize/mediators#mediaType" },
      "mediatorMediaTypeFormatCombiner": { "@id": "urn:comunica:default:rdf-serialize/mediators#mediaTypeFormat" }
    },
  ]
}
```

### Config Parameters

* `mediatorRdfSerialize`: A mediator over the [RDF Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) for actual serialization.
* `mediatorRdfSerializeMediaTypeCombiner`: A mediator over the [RDF Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) for collecting media types.
* `mediatorRdfSerializeMediaTypeFormatCombiner`: A mediator over the [RDF Serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) for collecting media type formats.
