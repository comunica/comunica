# Comunica HTML RDF Parse Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-parse-html.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-parse-html)

An [RDF Parse](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse) actor that handles RDF in HTML,
by delegating to the [RDF Parse HTML bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse-html).
It creates an HTML parser, and delegates its events via the [RDF Parse HTML bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse-html) to other HTML parsing actors.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-parse-html
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-parse-html/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:rdf-parsers.json#myRdfParserHtml",
      "@type": "ActorRdfParseHtml",
      "priorityScale": 0.2
    }
  ]
}
```

### Config Parameters

* `caam:Actor/AbstractMediaTypedFixed/priorityScale`: An optional priority for this parser, used for content negotiation, defaults to `1`.
