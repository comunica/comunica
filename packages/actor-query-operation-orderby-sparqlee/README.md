# Comunica OrderBy Sparqlee Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-orderby-sparqlee.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-orderby-sparqlee)

A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles [SPARQL `ORDER BY`](https://www.w3.org/TR/sparql11-query/#sparqlOrderBy) operations.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-operation-orderby-sparqlee
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-operation-orderby-sparqlee/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-operation/actors#orderby",
      "@type": "ActorQueryOperationOrderBySparqlee",
      "mediatorQueryOperation": { "@id": "urn:comunica:default:query-operation/mediators#main" },
      "expressionEvaluatorFactory": { "@id": "urn:comunica:default:expression-evaluator/evaluators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorQueryOperation`: A mediator over the [Query Operation bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation).
* `expressionEvaluatorFactory`: A factory to create an [Expression Evaluator](https://github.com/comunica/comunica/tree/master/packages/expression-evaluator);
