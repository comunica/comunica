# Comunica PageSize RDF Metadata Accumulate Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-accumulate-pagesize.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-accumulate-pagesize)

An [RDF Metadata Accumulate](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-accumulate) actor that
handles the `pageSize` field.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-accumulate-pagesize
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-metadata-accumulate-pagesize/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-metadata-accumulate/actors#pagesize",
      "@type": "ActorRdfMetadataAccumulatePageSize"
    }
  ]
}
```
