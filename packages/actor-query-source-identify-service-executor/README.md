# Comunica Service Executor Query Source Identify Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-source-identify-service-executor.svg)](https://www.npmjs.com/package/@comunica/actor-query-source-identify-service-executor)

A [Query Source Identify](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify) actor
that handles the targets of `SERVICE` clauses for which a custom `SERVICE` executor is registered in the query context.

Custom executors allow `SERVICE` clauses to be evaluated by application code instead of by a remote source,
similar to how [extension functions](https://comunica.dev/docs/query/advanced/extension_functions/) can be provided.
They can be registered through the query context in one of two ways, but not both at the same time:

* `serviceExecutors`: a dictionary mapping `SERVICE` target IRIs to executors.
* `serviceExecutorCreator`: a synchronous callback creating an executor for a given `SERVICE` target IRI,
  or returning `undefined` if that target must be queried as a regular source.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-source-identify-service-executor
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-source-identify-service-executor/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-source-identify/actors#service-executor",
      "@type": "ActorQuerySourceIdentifyServiceExecutor",
      "beforeActors": { "@id": "urn:comunica:default:query-source-identify/actors#hypermedia" }
    }
  ]
}
```

This actor must be configured before other actors that could identify IRI sources,
such as [`@comunica/actor-query-source-identify-hypermedia`](https://github.com/comunica/comunica/tree/master/packages/actor-query-source-identify-hypermedia),
so that custom executors take precedence over them.
