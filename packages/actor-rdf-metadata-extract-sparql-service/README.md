# Comunica SPARQL Service RDF Metadata Extract Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-extract-sparql-service.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-extract-sparql-service)

An [RDF Metadata Extract](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract) actor that
extracts [SPARQL Service Description metadata](https://www.w3.org/TR/sparql11-service-description/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-extract-sparql-service
```

## Metadata entries

This actor adds the following entries to the metadata object.

* `sparqlService`: Value of `http://www.w3.org/ns/sparql-service-description#endpoint`.
* `defaultGraph`: Value of `http://www.w3.org/ns/sparql-service-description#defaultGraph`.

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-metadata-extract-sparql-service/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-sparql.json#myRdfMetadataExtractSparqlService",
      "@type": "ActorRdfMetadataExtractSparqlService"
    }
  ]
}
```

### Config Parameters

* `carmess:Actor/RdfMetadataExtract/SparqlService#inferHttpsEndpoint`: If HTTPS endpoints should be forcefully used if the original URL was HTTPS-based, defaults to `true`.
