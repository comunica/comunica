# Comunica Murmur Hash Quads Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-hash-quads-murmur.svg)](https://www.npmjs.com/package/@comunica/actor-hash-quads-murmur)

A [Hash Quads](https://github.com/comunica/comunica/tree/master/packages/bus-hash-quads) actor that
provides a MurmurHash3-based hash function.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-hash-quads-murmur
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-hash-quads-murmur/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:hash-quads/actors#murmur",
      "@type": "ActorHashQuadsMurmur"
    }
  ]
}
```

### Config Parameters

TODO: fill in parameters (this section can be removed if there are none)

* `someParam`: Description of the param
