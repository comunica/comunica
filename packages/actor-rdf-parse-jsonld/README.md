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
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-parse-jsonld/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-parse/actors#jsonld",
      "@type": "ActorRdfParseJsonLd",
      "priorityScale": 0.9,
      "mediatorHttp": { "@id": "urn:comunica:default:http/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `priorityScale`: An optional priority for this parser, used for content negotiation, defaults to `1`.
* `mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http), for fetching remote JSON-LD contexts.

### Passing custom options

If you want to pass custom options to the JSON-LD parser,
you can use the `'@comunica/actor-rdf-parse-jsonld:parserOptions'` [context entry](https://comunica.dev/docs/query/advanced/context/)
to provide [parser options](https://github.com/rubensworks/jsonld-streaming-parser.js#configuration) as a hash.

### Using a custom document loader

If you want to override how the JSON-LD parser loads external contexts,
you can pass a custom document loader via the `'@comunica/actor-rdf-parse-jsonld:documentLoader'` [context entry](https://comunica.dev/docs/query/advanced/context/).
This document loader must implement the [`IDocumentLoader`](https://github.com/rubensworks/jsonld-context-parser.js/blob/master/lib/IDocumentLoader.ts) interface.

### Enabling stricter parsing mode

Via the `'@comunica/actor-rdf-parse-jsonld:strictValues'` [context entry](https://comunica.dev/docs/query/advanced/context/),
you can set the JSON-LD parser to run in a more strict mode.
This corresponds to the `strictValues` option in [JSON-LD Streaming Parser](https://github.com/rubensworks/jsonld-streaming-parser.js#configuration).
