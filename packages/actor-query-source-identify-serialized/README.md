# Comunica Serialized Query Source Identify Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-source-identify-serialized.svg)](https://www.npmjs.com/package/@comunica/actor-query-source-identify-serialized)

A [Query Source Identify](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify) actor that handles serialized sources.

This actor enables to the possibility to provide data sources using the context in the form of a string, such as:
```js
{ sources: [{ type: 'serialized', value: `<ex:s> <ex:p> <ex:o>. <ex:s> <ex:p> <ex:z>.`, mediaType: 'text/turtle', baseIRI: 'http://example.org/' }];}
```

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-source-identify-serialized
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-source-identify-serialized/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-source-identify/actors#serialized",
      "@type": "ActorQuerySourceIdentifySerialized",
      "mediatorRdfParse": { "@id": "urn:comunica:default:rdf-parse/mediators#parse" },
      "mediatorQuerySourceIdentify": { "@id": "urn:comunica:default:query-source-identify/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorRdfParse`: A mediator over the [RDF Parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse).
* `mediatorQuerySourceIdentify`: A mediator over the [Query Source Identify bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify).
