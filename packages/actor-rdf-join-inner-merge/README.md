# Comunica Inner Merge RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-inner-merge.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-inner-merge)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that inner-joins two
streams that are sorted on shared join variables, by reading each side once and advances
the side that is behind.

This only works if both join entries have a `termOrder` in their metadata.

The output stays sorted on the key that was merged on, so merge joins can be chained.

Sources may additionally expose a `seek(target)` method on the bindings stream they return
(`ISeekableBindingsStream`), which skips past every remaining binding preceding `target` in the stream's declared
term order.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-inner-merge
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-inner-merge/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#inner-merge",
      "@type": "ActorRdfJoinMerge",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
