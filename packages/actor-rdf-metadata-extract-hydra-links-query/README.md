# Comunica Query-based Hydra Links RDF Metadata Extract Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-extract-hydra-links-query.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-extract-hydra-links-query)

An [RDF Metadata Extract](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract) actor that
extract links in the [Hydra Core vocabulary](https://www.hydra-cg.com/spec/latest/core/)
using a GraphQL-LD query.

This is a query-based variant of [@comunica/actor-rdf-metadata-extract-hydra-controls](https://github.com/comunica/comunica/tree/master/packages/actor-rdf-metadata-extract-hydra-controls).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-extract-hydra-links-query
```

## Metadata entries

This actor adds the following entries to the metadata object.

* `first`: Value of `http://www.w3.org/ns/hydra/core#first`.
* `next`: Value of `http://www.w3.org/ns/hydra/core#next`.
* `previous`: Value of `http://www.w3.org/ns/hydra/core#previous`.
* `last`: Value of `http://www.w3.org/ns/hydra/core#last`.

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-metadata-extract-hydra-links-query/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-hypermedia.json#myRdfMetadataExtractHydraLinksQuery",
      "@type": "ActorRdfMetadataExtractHydraLinksQuery"
    }
  ]
}
```
