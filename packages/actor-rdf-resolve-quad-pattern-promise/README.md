# Comunica Promise RDF Resolve Quad Pattern Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-resolve-quad-pattern-promise.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-resolve-quad-pattern-promise)

A comunica RDF Resolve Quat Pattern Actor for source wrapped in a promise

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-resolve-quad-pattern-promise
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-resolve-quad-pattern-promise/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-resolve-quad-pattern/actors#promise",
      "@type": "ActorRdfResolveQuadPatternPromise"
    }
  ]
}
```

### Config Parameters

TODO: fill in parameters (this section can be removed if there are none)

* `mediatorRdfResolveQuadPattern`: Actors to use to resolve quad patterns once the source is resolved
