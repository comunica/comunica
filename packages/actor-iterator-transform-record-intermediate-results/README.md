# Comunica Record Intermediate Results Process Iterator Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-process-iterator-record-intermediate-results.svg)](https://www.npmjs.com/package/@comunica/actor-process-iterator-record-intermediate-results)

A Comunica Record Intermediate Results Process Iterator Actor. This actor wraps (intermediate) iterators produced during query execution. This wrapper
calls the `updateStatistic` function of `@comunica/statistic-intermediate-results` which should be present in the context. This statistic should be
added to the context by the user. This is possible when using Comunica in a javascript [application](https://comunica.dev/docs/query/getting_started/query_app/) or by implementing your own `actor-context-preprocess` actor that adds this statistic to the context.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-process-iterator-record-intermediate-results
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-process-iterator-record-intermediate-results/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:process-iterator/actors#record-intermediate-results",
      "@type": "ActorProcessIteratorRecordIntermediateResults"
    }
  ]
}
```

### Config Parameters
* `wraps`: String representations of the operations that this actor should wrap. If `undefined` this actor will wrap all operations.
