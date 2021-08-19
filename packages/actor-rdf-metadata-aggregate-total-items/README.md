# Comunica Total Items RDF Metadata Aggregate Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-aggregate-total-items.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-aggregate-total-items)

A comunica Total Items RDF Metadata Aggregate Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-aggregate-total-items
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-metadata-aggregate/^1.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-metadata-aggregate-total-items/^1.0.0/components/context.jsonld"
  ],
  "@id": "urn:comunica:my",
  "actors": [
    {
      "@id": "config-sets:rdf-metadata-aggregate.json#myActorRdfMetadataAggregateTotalItems",
      "@type": "ActorRdfMetadataAggregateTotalItems"
    }
  ]
}
```

### Config Parameters

TODO
