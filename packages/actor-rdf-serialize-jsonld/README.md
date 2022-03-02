# Comunica JSON-LD RDF Serialize Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-serialize-jsonld.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-serialize-jsonld)

An [RDF Serialize](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) actor that handles JSON-LD.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-serialize-jsonld
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-abstract-mediatyped/^2.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-serialize-jsonld/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-serialize/actors#jsonld",
      "@type": "ActorRdfSerializeJsonLd",
      "jsonStringifyIndentSpaces": 2,
      "priorityScale": 0.9
    }
  ]
}
```

### Config Parameters

* `jsonStringifyIndentSpaces`: An optional parameter to indicate with how many spaces JSON should be indented, defaults to `2`.
* `priorityScale`: An optional priority for this serializer, used for content negotiation, defaults to `1`.
