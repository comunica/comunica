# Comunica Hydra Pagesize RDF Metadata Extract Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-extract-hydra-pagesize.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-extract-hydra-pagesize)

An [RDF Metadata Extract](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract) actor that
extract page sizes in the [Hydra Core vocabulary](https://www.hydra-cg.com/spec/latest/core/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-extract-hydra-pagesize
```

## Metadata entries

This actor adds the following entries to the metadata object.

* `pageSize`: Value of `http://www.w3.org/ns/hydra/core#itemsPerPage`.

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-metadata-extract-hydra-pagesize/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-metadata-extract/actors#hydra-pagesize",
      "@type": "ActorRdfMetadataExtractHydraPagesize",
      "predicates": [
        "http://www.w3.org/ns/hydra/core#itemsPerPage"
      ]
    }
  ]
}
```

### Config Parameters

* `predicates`: The predicates to consider when determining page size, defaults to `http://www.w3.org/ns/hydra/core#itemsPerPage`.
