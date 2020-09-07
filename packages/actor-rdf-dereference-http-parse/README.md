# Comunica HTTP Parse RDF Dereference Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-dereference-http-parse.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-dereference-http-parse)

An [RDF Dereference](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-dereference) actor that
resolves the URL using the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http)
and parses it using the [RDF parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse).

An RDF Dereference actor implementation for Comunica that resolves the URL using the HTTP bus and parses it using the RDF arse bus.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-dereference-http-parse
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-dereference-http-parse/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:rdf-dereference.json#myRdfDereferencer",
      "@type": "ActorRdfDereferenceHttpParse",
      "mediatorHttp": {
        "@id": "config-sets:http.json#mediatorHttp"
      },
      "crdhp:mediatorRdfParseMediatypes": {
        "@id": "config-sets:rdf-dereference.json#mediatorRdfParseMediatypes",
        "@type": "MediatorCombineUnion",
        "cc:Mediator/bus": { "@id": "cbrp:Bus/RdfParse" },
        "cmcu:Mediator/CombineUnion/field": "mediaTypes"
      },
      "crdhp:mediatorRdfParseHandle": {
        "@id": "config-sets:rdf-dereference.json#mediatorRdfParseHandle",
        "@type": "MediatorRace",
        "cc:Mediator/bus": { "@id": "cbrp:Bus/RdfParse" }
      },
      "crdhp:maxAcceptHeaderLength": 1024,
      "crdhp:maxAcceptHeaderLengthBrowser": 128,
    }
  ]
}
```

### Config Parameters

* `crdhp:mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
* `crdhp:mediatorRdfParseMediatypes`: A mediator over the [RDF Parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse) for collecting media types.
* `crdhp:mediatorRdfParseHandle`: A mediator over the [RDF Parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse) for actual parsing.
* `crdhp:maxAcceptHeaderLength`: The maximum allowed accept header value length for non-browser environments, defaults to `1024`.
* `crdhp:maxAcceptHeaderLengthBrowser`: The maximum allowed accept header value length for browser environments, defaults to `128`.
