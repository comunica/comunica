# Comunica Set Defaults Context Preprocess Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-context-preprocess-set-defaults.svg)](https://www.npmjs.com/package/@comunica/actor-context-preprocess-set-defaults)

An [Context Preprocess](https://github.com/comunica/comunica/tree/master/packages/bus-context-preprocess) actor
that will set default context values for query engines, such as the logger, timestamp, function arguments cache, ...

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-context-preprocess-set-defaults
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-context-preprocess-set-defaults/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:context-preprocess/actors#set-defaults",
      "@type": "ActorContextPreprocessSetDefaults"
    }
  ]
}
```

### Config Parameters

* `logger`: The logger to set in the context, defaults to the void logger.
