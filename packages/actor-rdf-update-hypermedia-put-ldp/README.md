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
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-update-hypermedia-put-ldp/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-update-hypermedia/actors#put-ldp",
      "@type": "ActorRdfUpdateHypermediaPutLdp",
      "mediatorHttp": { "@id": "urn:comunica:default:http/mediators#main" },
      "mediatorRdfSerializeMediatypes": { "@id": "urn:comunica:default:query-result-serialize/mediators#mainMediatypes" },
      "mediatorRdfSerialize": { "@id": "urn:comunica:default:query-result-serialize/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
* `mediatorRdfSerializeMediatypes`: A mediator over the [RDF serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) for obtaining all media types.
* `mediatorRdfSerialize`: A mediator over the [RDF serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize).
