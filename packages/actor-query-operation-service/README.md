# Comunica Service Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-service.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-service)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
that handles SPARQL `SERVICE` clauses of which the target is a variable.

`SERVICE` clauses with an IRI target are rewritten into source-annotated operations by
[`@comunica/actor-optimize-query-operation-assign-sources-exhaustive`](https://github.com/comunica/comunica/tree/master/packages/actor-optimize-query-operation-assign-sources-exhaustive).

Variable targets are disabled by default, as the queried data then determines what is dereferenced,
which is problematic when queries originate from untrusted parties.
They can be enabled via the `serviceAllowVariableTargets` context entry.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-service
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-service/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-operation/actors#service",
      "@type": "ActorQueryOperationService",
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "mediatorQuerySourceIdentify": { "@id": "urn:comunica:default:query-source-identify/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `mediatorQuerySourceIdentify`: A mediator over the [Query Source Identify bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify).
* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
* `forceSparqlEndpoint`: If the SERVICE target should be assumed to be a SPARQL endpoint, defaults to `false`.
