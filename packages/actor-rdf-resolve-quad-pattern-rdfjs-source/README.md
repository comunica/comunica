# Comunica RDFJS Source RDF Resolve Quad Pattern Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-resolve-quad-pattern-rdfjs-source.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-resolve-quad-pattern-rdfjs-source)

An [RDF Resolve Quad Pattern](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-quad-pattern) actor that handles [RDF/JS Sources](https://comunica.dev/docs/query/advanced/rdfjs_querying/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-resolve-quad-pattern-rdfjs-source
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-resolve-quad-pattern-rdfjs-source/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-rdfjs.json#myRdfRdfJsSourceQuadPatternResolver",
      "@type": "ActorRdfResolveQuadPatternRdfJsSource"
    }
  ]
}
```
