# Comunica Allow HTTP Methods RDF Metadata Extract Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-extract-allow-http-methods.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-extract-allow-http-methods)

An [RDF Metadata Extract](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract) actor that
extracts the `Allow` HTTP response header.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-extract-allow-http-methods
```

## Metadata entries

This actor adds the following entries to the metadata object.

* `allowHttpMethods`: `[ 'GET', 'PUT', ... ]`.

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-metadata-extract-allow-http-methods/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-metadata-extract/actors#allow-http-methods",
      "@type": "ActorRdfMetadataExtractAllowHttpMethods"
    }
  ]
}
```
