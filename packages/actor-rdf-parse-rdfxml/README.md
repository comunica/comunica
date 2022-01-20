# Comunica RDF/XML RDF Parse Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-parse-rdfxml.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-parse-rdfxml)

An [RDF Parse](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse) actor that handles [RDF/XML](https://www.w3.org/TR/rdf-syntax-grammar/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-parse-rdfxml
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-parse-rdfxml/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-parse/actors#rdfxml",
      "@type": "ActorRdfParseRdfXml",
      "priorityScale": 0.5
    }
  ]
}
```

### Config Parameters

* `priorityScale`: An optional priority for this parser, used for content negotiation, defaults to `1`.
