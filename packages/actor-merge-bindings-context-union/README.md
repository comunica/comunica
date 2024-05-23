# Comunica Context Union Merge Binding Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-merge-binding-factory-context-union.svg)](https://www.npmjs.com/package/@comunica/actor-merge-bindings-context-union)

An [Merge Bindings Context](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context) actor
that merges context entry values by taking the set-union.
Values are compared using JavaScript's Set equality semantics.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-merge-binding-factory-context-union
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-merge-binding-factory-context-union/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:merge-binding-factory/actors#context-union",
      "@type": "ActorMergeBindingFactoryContextUnion",
      "contextKey": "sources"
    }
  ]
}
```

### Config Parameters

* `contextKey`: The context key name to merge over.
