# Comunica sparql-results+json Query Result Serialize Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-result-serialize-sparql-json.svg)](https://www.npmjs.com/package/@comunica/actor-query-result-serialize-sparql-json)

A [Query Result Serialize](https://github.com/comunica/comunica/tree/master/packages/bus-query-result-serialize) actor that serializes to [SPARQL/JSON](https://www.w3.org/TR/sparql11-results-json/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-result-serialize-sparql-json
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-result-serialize-sparql-json/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-result-serialize/actors#sparql-json",
      "@type": "ActorQueryResultSerializeSparqlJson"
    }
  ]
}
```

### Config Parameters

* `emitMetadata`: If a metadata object should be appended to the query results. This contains information such as the number of HTTP requests required for executing the query. _(default: `true`)_
