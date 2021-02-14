# Comunica RDFJS Store RDF Update Quads Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-update-quads-rdfjs-store.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-update-quads-rdfjs-store)

An [RDF Update Quads](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-update-quads) actor
that handles [RDF/JS Stores](https://comunica.dev/docs/query/advanced/rdfjs_querying/).

RDF/JS Stores are assumed to not record empty graphs.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-update-quads-rdfjs-store
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-update-quads-rdfjs-store/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:rdf-update-rdfjs.json#myRdfUpdateQuadsRdfJsStore",
      "@type": "ActorRdfUpdateQuadsRdfJsStore"
    }
  ]
}
```
