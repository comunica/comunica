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

An executor is an object with an `execute` function that evaluates a `SERVICE` clause,
and optionally a `getMetadata` function that provides the query planner with the number of solutions it will return, or an estimate of it.
For example, the following evaluates a `SERVICE` clause through an executor that produces its solutions itself:

```javascript
import { QueryEngine } from '@comunica/query-sparql';
import { KeysInitQuery } from '@comunica/context-entries';
import { BindingsFactory } from '@comunica/utils-bindings-factory';

const engine = new QueryEngine();

const greetExecutor = {
  execute: async (serviceOperation, bindings, context) => {
    const dataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const bindingsFactory = new BindingsFactory(dataFactory);
    return [
      bindingsFactory.bindings([[ dataFactory.variable('greeting'), dataFactory.literal('Hello world!') ]]),
    ];
  },
  getMetadata: async (serviceOperation, context) => ({ cardinality: { type: 'exact', value: 1 } }),
};

const query = `SELECT ?greeting WHERE {
  SERVICE <urn:my-app:greet> { <urn:my-app:me> <urn:my-app:greeting> ?greeting }
}`;

// With a dictionary of executors per SERVICE target IRI:
const bindingsStream = await engine.queryBindings(query, {
  sources: [],
  serviceExecutors: { 'urn:my-app:greet': greetExecutor },
});

// Or with a creator, which can also handle parameterized target IRIs:
const bindingsStream2 = await engine.queryBindings(query, {
  sources: [],
  serviceExecutorCreator: serviceNamedNode => serviceNamedNode.value === 'urn:my-app:greet' ? greetExecutor : undefined,
});
```

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
