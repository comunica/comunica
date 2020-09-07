# Comunica All RDF Metadata Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-all.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-all)

An [RDF Metadata](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata) actor
that sees everything as both data and metadata.
This actor should be used as a fallback after other RDF Metadata actors.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-all
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-metadata-all/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-hypermedia.json#myRdfMetadataAll",
      "@type": "ActorRdfMetadataAll"
    }
  ]
}
```
