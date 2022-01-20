# Comunica Microdata RDF Parse Html Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-parse-html-microdata.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-parse-html-microdata)

An [RDF Parse HTML](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse-html) actor that handles [Microdata to RDF conversion](https://w3c.github.io/microdata-rdf/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-parse-html-microdata
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-parse-html-microdata/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-parse-html/actors#microdata",
      "@type": "ActorRdfParseHtmlMicrodata"
    }
  ]
}
```
