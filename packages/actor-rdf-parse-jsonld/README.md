# Comunica JSON-LD RDF Parse Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-parse-jsonld.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-parse-jsonld)

An [RDF Parse](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse) actor that handles [JSON-LD](https://json-ld.org/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-parse-jsonld
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-parse-jsonld/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:rdf-parsers.json#myRdfParserJsonLd",
      "@type": "ActorRdfParseJsonLd",
      "priorityScale": 0.9,
      "crpjl:Actor/RdfParse/JsonLd/mediatorHttp": { "@id": "config-sets:http.json#mediatorHttp" }
    }
  ]
}
```

### Config Parameters

* `caam:Actor/AbstractMediaTypedFixed/priorityScale`: An optional priority for this parser, used for content negotiation, defaults to `1`.
* `crpjl:Actor/RdfParse/JsonLd/mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http), for fetching remote JSON-LD contexts.
