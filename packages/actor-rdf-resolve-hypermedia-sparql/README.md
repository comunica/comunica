# Comunica SPARQL RDF Resolve Hypermedia Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-resolve-hypermedia-sparql.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-resolve-hypermedia-sparql)

An [RDF Resolve Hypermedia](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia) actor that handles [SPARQL endpoints](https://www.w3.org/TR/sparql11-protocol/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-resolve-hypermedia-sparql
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-resolve-hypermedia-sparql/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-sparql.json#mySparqlQuadPatternResolver",
      "@type": "ActorRdfResolveHypermediaSparql",
      "carrhs:Actor/RdfResolveHypermedia/Sparql/mediatorHttp": {
        "@id": "config-sets:http.json#mediatorHttp"
      }
    }
  ]
}
```

### Config Parameters

* `carrhs:Actor/RdfResolveHypermedia/Sparql/mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
