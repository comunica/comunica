# Comunica Explain Federated Query Process Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-process-explain-federated.svg)](https://www.npmjs.com/package/@comunica/actor-query-process-explain-federated)

A [Query Process](https://github.com/comunica/comunica/tree/master/packages/bus-query-process) actor
that produces the federated version of a query after parsing and optimization,
by converting algebra operation source assignments into `SERVICE` clauses,
allowing for the inspection and comparison of automated query federation by the engine,
as well as for the use of Comunica to handle the federation of a query but another engine to execute it.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-process-explain-federated
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-process-explain-federated/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    {
      "@id": "urn:comunica:default:query-process/actors#explain-federated",
      "@type": "ActorQueryProcessExplainFederated"
    }
  ]
}
```

### Config Parameters

* `queryProcessor`: Reference to the query processor.
