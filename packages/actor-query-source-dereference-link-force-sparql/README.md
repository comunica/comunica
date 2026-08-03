# Comunica Force SPARQL Query Source Hypermedia Resolve Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-source-dereference-link-force-sparql.svg)](https://www.npmjs.com/package/@comunica/actor-query-source-dereference-link-force-sparql)

A [Query Source Dereference Link](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-dereference-link) actor that avoids metadata fetching of forced SPARQL endpoints.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-source-dereference-link-force-sparql
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-source-dereference-link-force-sparql/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-source-dereference-link/actors#force-sparql",
      "@type": "ActorQuerySourceDereferenceLinkForceSparql",
      "mediatorMetadataAccumulate": { "@id": "urn:comunica:default:rdf-metadata-accumulate/mediators#main" },
      "mediatorQuerySourceIdentifyHypermedia": { "@id": "urn:comunica:default:query-source-identify-hypermedia/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorMetadataAccumulate`: A mediator over the [Metadata Accumulatebus](https://github.com/comunica/comunica/tree/master/packages/bus-metadata-accumulate).
* `mediatorQuerySourceIdentifyHypermedia`: A mediator over the [Query Source Identify Hypermedia bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify-hypermedia).
