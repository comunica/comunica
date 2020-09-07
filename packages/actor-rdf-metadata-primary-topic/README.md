# Comunica Primary Topic RDF Metadata Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-primary-topic.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-primary-topic)

An [RDF Metadata](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata) actor that
splits off the metadata based on the existence of a `foaf:primaryTopic` link.

**Warning:** Use this at your own risk, as this actor _requires_ `foaf:primaryTopic` to be linked with the metadata graph,
while the [spec keeps this optional](https://www.hydra-cg.com/spec/latest/triple-pattern-fragments/).
Furthermore, `foaf:primaryTopic` must come _before_ the metadata triples.
But in cases where `foaf:primaryTopic` is always used, this actor will be very performant.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-primary-topic
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-metadata-primary-topic/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-hypermedia.json#myRdfMetadataPrimaryTopic",
      "@type": "ActorRdfMetadataPrimaryTopic"
    }
  ]
}
```
