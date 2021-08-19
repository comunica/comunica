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
     "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-metadata-aggregate/^1.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/mediator-all/^1.0.0/components/context.jsonld"

  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-federated.json#myFederatedQuadPatternResolver",
      "@type": "ActorRdfResolveQuadPatternFederated",
      "carrqpf:Actor/RdfResolveQuadPattern/Federated/mediatorResolveQuadPattern": {
        "@id": "config-sets:sparql-queryoperators.json#mediatorResolveQuadPattern"
      },
      "carrqpf:Actor/RdfResolveQuadPattern/Federated/mediatorRdfMetadataAggregate": {
        "@id": "config-sets:resolve-federated.json#mediatorRdfMetadataAggregate",
        "@type": "MediatorAll",
        "cc:Mediator/bus": { "@id": "cbrma:Bus/RdfMetadataAggregate" }
      }
    }
  ]
}
```

### Config Parameters

* `carrqpf:Actor/RdfResolveQuadPattern/Federated/mediatorResolveQuadPattern`: A mediator over the [RDF Resolve Quad Pattern bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-quad-pattern).
* `carrqpf:Actor/RdfResolveQuadPattern/Federated/mediatorRdfMetadataAggregate`: A mediator over the [RDF Metadata Aggregate bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-quad-pattern).
