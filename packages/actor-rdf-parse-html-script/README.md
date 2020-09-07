# Comunica Html Script RDF Parse Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-parse-html-script.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-parse-html-script)

An [RDF Parse HTML](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse-html) actor that handles
[script tags in HTML](https://html.spec.whatwg.org/multipage/) by delegating to the [RDF Parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-parse-html-script
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-parse-html-script/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:rdf-parsers.json#myRdfParserHtmlScript",
      "@type": "ActorRdfParseHtmlScript",
      "carphs:mediatorRdfParseMediatypes": {
        "@id": "config-sets:rdf-parsers.json#mediatorRdfParseMediatypes",
        "@type": "MediatorCombineUnion",
        "cc:Mediator/bus": { "@id": "cbrp:Bus/RdfParse" },
        "cmcu:Mediator/CombineUnion/field": "mediaTypes"
      },
      "carphs:mediatorRdfParseHandle": {
        "@id": "config-sets:rdf-parsers.json#mediatorRdfParseHandle",
        "@type": "MediatorRace",
        "cc:Mediator/bus": { "@id": "cbrp:Bus/RdfParse" }
      }
    }
  ]
}
```

### Config Parameters

* `carphs:mediatorRdfParseMediatypes`: A mediator over the [RDF Parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse) for collecting media types.
* `carphs:mediatorRdfParseHandle`: A mediator over the [RDF Parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse) for actual parsing.
