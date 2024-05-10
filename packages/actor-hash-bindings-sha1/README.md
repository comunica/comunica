# Comunica SHA1 Hash Bindings Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-hash-bindings-sha1.svg)](https://www.npmjs.com/package/@comunica/actor-hash-bindings-sha1)

A [Hash Bindings](https://github.com/comunica/comunica/tree/master/packages/bus-hash-bindings) actor that
provides a SHA1 hash function.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-hash-bindings-sha1
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-hash-bindings-sha1/^3.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:hash-bindings/actors#sha1",
      "@type": "ActorHashBindingsSha1"
    }
  ]
}
```
