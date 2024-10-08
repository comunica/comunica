# Comunica Source To Destination Context Preprocess Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-context-preprocess-source-to-destination.svg)](https://www.npmjs.com/package/@comunica/actor-context-preprocess-source-to-destination)

An [Context Preprocess](https://github.com/comunica/comunica/tree/master/packages/bus-context-preprocess) actor
that defines the write destination only if a single query source has been defined.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-context-preprocess-source-to-destination
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-context-preprocess-source-to-destination/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:context-preprocess/actors#source-to-destination",
      "@type": "ActorContextPreprocessSourceToDestination"
    }
  ]
}
```
