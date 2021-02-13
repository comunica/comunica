# Comunica Fallback RDF Dereference Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-dereference-fallback.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-dereference-fallback)

An [RDF Dereference](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-dereference) actor that always fails.
This can be used as a fallback actor in the RDF Dereference bus.
Concretely, it accepts any action in its test phase, but rejects all actions in its run phase.
If lenient mode is enabled, the rejection will be silenced.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-dereference-fallback
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-dereference-fallback/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": TODO,
      "@type": "ActorRdfDereferenceFallback"
    }
  ]
}
```

### Config Parameters

TODO
