# Comunica Context Union Merge Binding Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-merge-binding-factory-context-union.svg)](https://www.npmjs.com/package/@comunica/actor-merge-binding-factory-context-union)

A Comunica Merge Binding Factory Source Binding Union Actor. This actors creates union functions for prespecified binding context keys.

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
      "@type": "ActorMergeBindingFactoryContextUnion"
    }
  ]
}
```

### Config Parameters

TODO: fill in parameters (this section can be removed if there are none)

* `someParam`: Description of the param
