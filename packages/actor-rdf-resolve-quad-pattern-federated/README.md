# Comunica Federated RDF Resolve Quad Pattern Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-resolve-quad-pattern-federated.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-resolve-quad-pattern-federated)

An [RDF Resolve Quad Pattern](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-quad-pattern) actor
that handles [a federation of multiple sources](https://comunica.dev/docs/query/advanced/federation/),
and delegates resolving each source separately using the [RDF Resolve Quad Pattern bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-quad-pattern).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-resolve-quad-pattern-federated
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-resolve-quad-pattern-federated/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-federated.json#myFederatedQuadPatternResolver",
      "@type": "ActorRdfResolveQuadPatternFederated",
      "carrqpf:Actor/RdfResolveQuadPattern/Federated/mediatorResolveQuadPattern": {
        "@id": "config-sets:sparql-queryoperators.json#mediatorResolveQuadPattern"
      }
    }
  ]
}
```

### Config Parameters

* `carrqpf:Actor/RdfResolveQuadPattern/Federated/mediatorResolveQuadPattern`: A mediator over the [RDF Resolve Quad Pattern bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-quad-pattern).
