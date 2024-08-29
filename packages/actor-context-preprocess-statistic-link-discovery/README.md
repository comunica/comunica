# Comunica Statistic Link Discovery Context Preprocess Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-context-preprocess-statistic-link-discovery.svg)](https://www.npmjs.com/package/@comunica/actor-context-preprocess-statistic-link-discovery)

A comunica Statistic Link Discovery Context Preprocess Actor. This actor emits discovered links and their metadata. If a link is discovered multiple times this actor saves the metadata in a list of JSON objects.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-context-preprocess-statistic-link-discovery
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-context-preprocess-statistic-link-discovery/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:context-preprocess/actors#statistic-link-discovery",
      "@type": "ActorContextPreprocessStatisticLinkDiscovery"
    }
  ]
}
```
