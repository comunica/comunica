# Comunica SPARQL CSV Query Result Serialize Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-result-serialize-sparql-csv.svg)](https://www.npmjs.com/package/@comunica/actor-query-result-serialize-sparql-csv)

A [Query Result Serialize](https://github.com/comunica/comunica/tree/master/packages/bus-query-result-serialize) actor that serializes to [SPARQL/CSV](https://www.w3.org/TR/sparql11-results-csv-tsv/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-result-serialize-sparql-csv
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-result-serialize-sparql-csv/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-result-serialize/actors#sparql-csv",
      "@type": "ActorQueryResultSerializeSparqlCsv"
    }
  ]
}
```
