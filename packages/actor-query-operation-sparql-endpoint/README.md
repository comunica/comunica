# Comunica SPARQL Endpoint Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-sparql-endpoint.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-sparql-endpoint)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that delegates
any operations to a SPARQL endpoint if the context contains just a single source.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-sparql-endpoint
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-sparql-endpoint/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "config-sets:resolve-sparql.json#mySparqlEndpointResolver",
      "@type": "ActorQueryOperationSparqlEndpoint",
      "caqose:Actor/QueryOperation/SparqlEndpoint/mediatorHttp": { "@id": "config-sets:http.json#mediatorHttp" }
    }
  ]
}
```

### Config Parameters

* `caqose:Actor/QueryOperation/SparqlEndpoint/mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
* `caqose:Actor/QueryOperation/SparqlEndpoint/forceHttpGet`: If queries should be sent via HTTP GET instead of POST, defaults to `false`.
