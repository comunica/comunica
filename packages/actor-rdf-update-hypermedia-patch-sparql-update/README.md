# Comunica Patch SPARQL Update RDF Update Hypermedia Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-update-hypermedia-patch-sparql-update.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-update-hypermedia-patch-sparql-update)

An [RDF Update Hypermedia](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-update-hypermedia) actor
that handles destinations over HTTP using SPARQL Update queries.

For example, this can be used for updating [Solid servers](https://github.com/solid/solid-spec/blob/master/api-rest.md#alternative-using-sparql-1).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-update-hypermedia-patch-sparql-update
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-update-hypermedia-patch-sparql-update/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:rdf-update-rdfjs.json#myRdfUpdateHypermediaPatchSparqlUpdate",
      "@type": "ActorRdfUpdateHypermediaPatchSparqlUpdate",
      "caruhpsu:Actor/RdfUpdateHypermedia/PatchSparqlUpdate#mediatorHttp": {
        "@id": "config-sets:http.json#mediatorHttp"
      },
      "caruhpsu:Actor/RdfUpdateHypermedia/PatchSparqlUpdate#mediatorRdfSerialize": {
        "@id": "config-sets:sparql-serializers.json#mediatorRdfSerialize"
      }
    }
  ]
}
```

### Config Parameters

* `caruhpsu:Actor/RdfUpdateHypermedia/PatchSparqlUpdate#mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
* `caruhpsu:Actor/RdfUpdateHypermedia/PatchSparqlUpdate#mediatorRdfSerialize`: A mediator over the [RDF serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize).
