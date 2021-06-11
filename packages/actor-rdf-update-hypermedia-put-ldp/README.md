# Comunica Put LDP RDF Update Hypermedia Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-update-hypermedia-put-ldp.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-update-hypermedia-put-ldp)

An [RDF Update Hypermedia](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-update-hypermedia) actor
that handles destinations over HTTP via HTTP [Linked Data Platform](https://www.w3.org/TR/ldp/) PUT requests.

Optionally, if the destination exposes the [`Accept-Put` header](https://solidproject.org/TR/protocol#accept-put),
the server's suggested media type will be used as PUT content type.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-update-hypermedia-put-ldp
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-update-hypermedia-put-ldp/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:rdf-update-rdfjs.json#myRdfUpdateHypermediaPutLdp",
      "@type": "ActorRdfUpdateHypermediaPutLdp",
      "caruhpl:Actor/RdfUpdateHypermedia/PutLdp#mediatorHttp": {
        "@id": "config-sets:http.json#mediatorHttp"
      },
      "caruhpl:Actor/RdfUpdateHypermedia/PutLdp#mediatorRdfSerializeMediatypes": {
        "@id": "config-sets:sparql-serializers.json#mediatorRdfSerializeMediatypes"
      },
      "caruhpl:Actor/RdfUpdateHypermedia/PutLdp#mediatorRdfSerialize": {
        "@id": "config-sets:sparql-serializers.json#mediatorRdfSerialize"
      }
    }
  ]
}
```

### Config Parameters

* `caruhpl:Actor/RdfUpdateHypermedia/PutLdp#mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
* `caruhpl:Actor/RdfUpdateHypermedia/PutLdp#mediatorRdfSerializeMediatypes`: A mediator over the [RDF serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) for obtaining all media types.
* `caruhpl:Actor/RdfUpdateHypermedia/PutLdp#mediatorRdfSerialize`: A mediator over the [RDF serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize).
