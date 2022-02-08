# Comunica File Dereference Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-dereference-file.svg)](https://www.npmjs.com/package/@comunica/actor-dereference-file)

A comunica File Dereference Actor.

An [Dereference](https://github.com/comunica/comunica/tree/master/packages/bus-dereference) actor that
resolves an URL to a local file (optionally starting with `file://`).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-dereference-file
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-dereference-file/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:dereference/actors#file",
      "@type": "ActorRdfDereferenceFile"
    }
  ]
}
```
