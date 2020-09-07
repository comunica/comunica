# Comunica File RDF Dereference Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-dereference-file.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-dereference-file)

An [RDF Dereference](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-dereference) actor that
resolves an URL to a local file (optionally starting with `file://`)
and parses it using the [RDF parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-dereference-file
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
      "@id": "config-sets:rdf-dereference.json#myRdfFileDereferencer",
      "@type": "ActorRdfDereferenceFile",
      "cardf:mediatorRdfParse": {
        "@id": "config-sets:rdf-dereference.json#mediatorRdfParse",
        "@type": "MediatorRace",
        "cc:Mediator/bus": { "@id": "cbrp:Bus/RdfParse" }
      }
    }
  ]
}
```

### Config Parameters

* `cardf:mediatorRdfParse`: A mediator over the [RDF Parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse) for actual parsing.
