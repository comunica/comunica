# Comunica Patch SPARQL Update RDF Metadata Extract Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-extract-patch-sparql-update.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-extract-patch-sparql-update)

An [RDF Metadata Extract](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract) actor that
that check for the value `application/sparql-update` in the `Accept-Patch` header.

For example, this is exposed by [Solid servers](https://github.com/solid/solid-spec/blob/master/api-rest.md#alternative-using-sparql-1).  

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-extract-patch-sparql-update
```

## Metadata entries

This actor adds the following entries to the metadata object.

* `patchSparqlUpdate`: `true` if the required header value was found.

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-metadata-extract-patch-sparql-update/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-hypermedia.json#myRdfMetadataExtractPatchSparqlUpdate",
      "@type": "ActorRdfMetadataExtractPatchSparqlUpdate"
    }
  ]
}
```
