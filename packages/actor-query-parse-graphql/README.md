# Comunica GraphQL Query Parse Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-parse-graphql.svg)](https://www.npmjs.com/package/@comunica/actor-query-parse-graphql)

A [Query Parse](https://github.com/comunica/comunica/tree/master/packages/bus-query-parse) actor that handles [GraphQL-LD queries](https://github.com/rubensworks/graphql-ld.js).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-parse-graphql
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-parse-graphql/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-parse/actors#graphql",
      "@type": "ActorQueryParseGraphql"
    }
  ]
}
```
