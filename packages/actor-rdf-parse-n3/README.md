# Comunica N3 RDF Parse Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-parse-n3.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-parse-n3)

An [RDF Parse](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse) actor that handles
Turtle, TriG, N-Quads, N-Triples and N3 using [N3.js](https://www.npmjs.com/package/n3).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-parse-n3
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-parse-n3/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-parse/actors#n3",
      "@type": "ActorRdfParseN3",
      "priorityScale": 1.0
    }
  ]
}
```

### Config Parameters

* `priorityScale`: An optional priority for this parser, used for content negotiation, defaults to `1`.
