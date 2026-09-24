# Comunica Set Sources From Dataset Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-set-sources-from-dataset.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-set-sources-from-dataset)

A comunica Set Sources From Dataset Optimize Query Operation Actor.

This actor appends the IRIs of the query's `FROM` and `FROM NAMED` clauses as sources to the context,
and removes the dataset clauses from the query afterwards.
IRIs from `FROM NAMED` clauses are tagged so that their data is exposed under the named graph of that IRI,
while IRIs from `FROM` clauses are queried as regular sources.

This actor is only enabled when the `dereferenceFromNamed` context entry is set to `true`.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-set-sources-from-dataset
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-set-sources-from-dataset/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#set-sources-from-dataset",
      "@type": "ActorOptimizeQueryOperationSetSourcesFromDataset"
    }
  ]
}
```
