# Comunica Quadpattern Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-quadpattern.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-quadpattern)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles [SPARQL triple/quad pattern](https://www.w3.org/TR/sparql11-query/#QSynTriples) operations
by delegating to the [RDF Resolve Quad Pattern bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-quad-pattern).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-quadpattern
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-quadpattern/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:sparql-queryoperators.json#myQuadPatternQueryOperator",
      "@type": "ActorQueryOperationQuadpattern",
      "caqoq:mediatorResolveQuadPattern": { "config-sets:sparql-queryoperators.json#mediatorResolveQuadPattern" }
    }
  ]
}
```

### Config Parameters

* `caqoq:mediatorResolveQuadPattern`: A mediator over the [RDF Resolve Quad Pattern bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-quad-pattern).

## Notes

### Quad-pattern-level context

Optionally, quad pattern operations may have a `context` field
that is of type `ActionContext`.
If such a quad-pattern-level context is detected,
it will be merged with the actor operation context.

This feature is useful if you want to attach specific flags
to quad patterns within the query plan,
such as the source(s) it should query over.
