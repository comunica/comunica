# Comunica Group File Sources Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-group-file-sources.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-group-file-sources)

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor
that optimizes federated queries over multiple file sources by combining them into a single composite file source.

When a query is executed over two or more `file`-type sources, this actor groups them into a single `compositefile` source.
This simplifies query planning by reducing the number of later union branches.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-group-file-sources
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-group-file-sources/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#group-file-sources",
      "@type": "ActorOptimizeQueryOperationGroupFileSources",
      "mediatorQuerySourceIdentify": { "@id": "urn:comunica:default:query-source-identify/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorQuerySourceIdentify`: A mediator over the [Query Source Identify bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify).
