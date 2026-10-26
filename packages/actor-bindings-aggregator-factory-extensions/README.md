# Comunica Extensions Bindings Aggregator Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-bindings-aggregator-factory-extensions.svg)](https://www.npmjs.com/package/@comunica/actor-bindings-aggregator-factory-extensions)

A [bindings aggregator factory](https://github.com/comunica/comunica/tree/master/packages/bus-bindings-aggregator-factory) actor
that constructs a bindings aggregator for any [extension](https://www.w3.org/TR/sparql11-query/#extensionFunctions) aggregate
passed by the `extensionAggregatorCreator` or `extensionAggregators`
[context keys](https://github.com/comunica/comunica/blob/master/packages/context-entries/lib/Keys.ts).

An extension aggregate creates the aggregator of a single group.
Like for [extension functions](https://github.com/comunica/comunica/tree/master/packages/actor-function-factory-expression-extensions),
the arguments of the aggregate call are evaluated beforehand,
and the aggregator receives the evaluated arguments of each solution in the group:

```typescript
const result = await engine.queryBindings(`
PREFIX ex: <http://example.org/>
SELECT (ex:median(?o) AS ?median) WHERE { ?s ?p ?o } GROUP BY ?s`, {
  sources: [ 'https://www.rubensworks.net/' ],
  extensionAggregators: {
    'http://example.org/median': () => {
      const values: number[] = [];
      return {
        put([ term ]) {
          values.push(Number.parseFloat(term.value));
        },
        result() {
          // Calculate and return the median of values as an RDF term
        },
      };
    },
  },
});
```

Like for the built-in aggregates:
* With `DISTINCT`, each distinct list of arguments is only put once.
* Solutions for which an argument uses an unbound variable are skipped.
* Errors evaluating the arguments, or thrown by the aggregator, leave the result unbound.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-bindings-aggregator-factory-extensions
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-bindings-aggregator-factory-extensions/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:bindings-aggregator-factory/actors#extensions",
      "@type": "ActorBindingsAggregatorFactoryExtensions",
      "mediatorExpressionEvaluatorFactory": { "@id": "urn:comunica:default:expression-evaluator-factory/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorExpressionEvaluatorFactory`: A mediator over the [Expression Evaluator Factory bus](https://github.com/comunica/comunica/tree/master/packages/bus-expression-evaluator-factory).
