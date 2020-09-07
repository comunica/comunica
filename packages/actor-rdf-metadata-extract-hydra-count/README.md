# Comunica Hydra Count RDF Metadata Extract Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-extract-hydra-count.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-extract-hydra-count)

An [RDF Metadata Extract](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract) actor that
extract estimated counts in the [Hydra Core vocabulary](https://www.hydra-cg.com/spec/latest/core/)
and [VoID](https://www.w3.org/TR/void/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-extract-hydra-count
```

## Metadata entries

This actor adds the following entries to the metadata object.

* `totalItems`: Value of `http://www.w3.org/ns/hydra/core#totalItems` or `http://rdfs.org/ns/void#triples`.

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-metadata-extract-hydra-count/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-hypermedia.json#myRdfMetadataExtractHydraCount",
      "@type": "ActorRdfMetadataExtractHydraCount",
      "carmehco:Actor/RdfMetadataExtract/HydraCount/predicate": [
        "http://www.w3.org/ns/hydra/core#totalItems",
        "http://rdfs.org/ns/void#triples"
      ]
    }
  ]
}
```

### Config Parameters

* `carmehco:Actor/RdfMetadataExtract/HydraCount/predicate`: The predicates to consider when determining counts, defaults to `http://www.w3.org/ns/hydra/core#totalItems` and `http://rdfs.org/ns/void#triples`.
