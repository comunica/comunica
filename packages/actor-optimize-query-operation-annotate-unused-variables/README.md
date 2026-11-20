# Comunica Annotate Unused Variables Optimize Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-optimize-query-operation-annotate-unused-variables.svg)](https://www.npmjs.com/package/@comunica/actor-optimize-query-operation-annotate-unused-variables)

An [Optimize Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-optimize-query-operation) actor that annotates triple patterns with `unusedVariables`.
This is a metadata entry that contains the names of the variables in the subject, predicate, or object of a pattern
that occur nowhere else in the query, such as `?name` in `SELECT ?person WHERE { ?person foaf:name ?name }`.
Their values are not needed, so sources may match these variables without binding them.

Queries that contain a wildcard in an expression, such as `COUNT(DISTINCT *)`, are not annotated.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-optimize-query-operation-annotate-unused-variables
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-optimize-query-operation-annotate-unused-variables/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:optimize-query-operation/actors#annotate-unused-variables",
      "@type": "ActorOptimizeQueryOperationAnnotateUnusedVariables"
    }
  ]
}
```

It should run after all other optimizers, so that it annotates the patterns of the final query.
