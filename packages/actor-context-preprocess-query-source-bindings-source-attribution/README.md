# Comunica Query Source Bindings Source Attribution Context Preprocess Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-context-preprocess-query-source-bindings-source-attribution.svg)](https://www.npmjs.com/package/@comunica/actor-context-preprocess-query-source-bindings-source-attribution)

A comunica Query Source Bindings Source Attribution Context Preprocess Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-context-preprocess-query-source-bindings-source-attribution
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-context-preprocess-query-source-bindings-source-attribution/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:context-preprocess/actors#query-source-bindings-source-attribution",
      "@type": "ActorContextPreprocessQuerySourceBindingsSourceAttribution"
    }
  ]
}
```

### Config Parameters

TODO: fill in parameters (this section can be removed if there are none)

* `someParam`: Description of the param
