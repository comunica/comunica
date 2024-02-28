# Comunica Convert Shortcuts Context Preprocess Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-context-preprocess-convert-shortcuts.svg)](https://www.npmjs.com/package/@comunica/actor-context-preprocess-convert-shortcuts)

An [Context Preprocess](https://github.com/comunica/comunica/tree/master/packages/bus-context-preprocess) actor
that expands shortcuts in the context to full context keys.
Available shortcuts can be configured in this actor via the `contextKeyShortcuts` parameter.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-context-preprocess-convert-shortcuts
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-context-preprocess-convert-shortcuts/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:context-preprocess/actors#convert-shortcuts",
      "@type": "ActorContextPreprocessConvertShortcuts"
    }
  ]
}
```

### Config Parameters

* `contextKeyShortcuts`: Shortcuts to expand.
