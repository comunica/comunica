# Comunica Expression Evaluator

[![npm version](https://badge.fury.io/js/%40comunica%2Fexpression-evaluator.svg)](https://www.npmjs.com/package/@comunica/expression-evaluator)

Previously called sparqlee - sparql expression evaluator. A simple spec-compliant SPARQL 1.1 expression evaluator package.

**[Learn more about the expression evaluator](https://comunica.dev/docs/modify/advanced/expression-evaluator/).**

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/utils-expression-evaluator
```

## Exposed classes

* [`ExpressionEvaluator`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.AsyncEvaluator.html): An evaluator for SPARQL expressions working with Promises.
* [`IAsyncEvaluatorContext`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.IAsyncEvaluatorContext.html): Context used to configure the `ExpressionEvaluator`. See [Config](https://comunica.dev/docs/modify/advanced/expression-evaluator/#config).
* [`SyncEvaluator`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.SyncEvaluator.html): An evaluator for SPARQL expressions working without Promises.
* [`ISyncEvaluatorContext`](https://comunica.github.io/comunica/interfaces/_comunica_expression_evaluator.ISyncEvaluatorContext.html): Context used to configure the `SyncEvaluator`. See [Config](https://comunica.dev/docs/modify/advanced/expression-evaluator/#config).
* [`AggregateEvaluator`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.AggregateEvaluator.html): An evaluator for SPARQL aggregate expressions working without promises. See [Aggregates](https://comunica.dev/docs/modify/advanced/expression-evaluator/#aggregates).
* [`ExpressionError`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.ExpressionError.html): An error class for SPARQL expression errors as defined in the [error section](https://comunica.dev/docs/modify/advanced/expression-evaluator/#errors).
* [`isExpressionError`](https://comunica.github.io/comunica/functions/_comunica_expression_evaluator.isExpressionError.html): A way to check if an error is of type `ExpressionError`.
* [`orderTypes`](https://comunica.github.io/comunica/functions/_comunica_expression_evaluator.orderTypes.html): A function to order types according to the [SPARQL ORDER BY specification](https://www.w3.org/TR/sparql11-query/#modOrderBy).
* [`AsyncAggregateEvaluator`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.AsyncAggregateEvaluator.html): An evaluator for SPARQL aggregate expressions working with promises. See [Aggregates](https://comunica.dev/docs/modify/advanced/expression-evaluator/#aggregates).

## Development

## Setup locally

1. Install `yarn` and `node`.
2. Run `yarn install`.
3. Use these evident commands (or check `package.json`):
    - building once: `yarn run build`

### Layout and control flow

SPARQL Algebra expression can be transformed to an internal representation (see [AlgebraTransformer.ts](../actor-expression-evaluator-factory-default/lib/AlgebraTransformer.ts)).
This will build objects (see [expressions module](./lib/expressions)) that contain all the logic and data for evaluation.
After transformation, the evaluator will recursively evaluate all the expressions.

### Testing

The testing environment is set up to do a lot of tests with little code.
The files responsible for fluent behaviour reside in the [`test/util`](./test/util) module.
Most tests can be run by running the `runTestTable` method in [utils](test/util/utils.ts).
This method expects a TestTable. Multiple test are run over a TestTable (one for every line).
A TestTable may contain aliases if the aliases are also provided
(Some handy aliases reside in [Aliases.ts](test/util/Aliases.ts)).
This means that when testing something like `"3"^^xsd:integer equals "3"^^xsd:integer` is `"true"^^xsd:boolean`.
We would write a small table (for this example some more tests are added) and test it like this:
```js
import { bool, merge, numeric } from './util/Aliases';
import { Notation } from './util/TruthTable';
import { runTestTable } from './util/utils';
runTestTable({
  testTable: `
       3i 3i = true
       3i -5i = false
       -0f 0f = true
       NaN  NaN = false
   `,
  arity: 2,
  operation: '=',
  aliases: merge(numeric, bool),
  notation: Notation.Infix,
});
```
More options can be provided and are explained with the type definition of the argument of `runTestTable`.

We can also provide an `errorTable` to the `runTestTable` method.
This is used when we want to test if calling certain functions on certain arguments throws the error we want.
An example is testing whether `Unknown named operator` error is thrown when
we don't provide the implementation for an extension function.
```js
import { bool, merge, numeric } from './util/Aliases';
import { Notation } from './util/TruthTable';
import { runTestTable } from './util/utils';
runTestTable({
  errorTable: `
       3i 3i = 'Unknown named operator'
       3i -5i = 'Unknown named operator'
       -0f 0f = 'Unknown named operator'
       NaN  NaN = 'Unknown named operator'
   `,
  arity: 2,
  operation: '<https://example.org/functions#equal>',
  aliases: merge(numeric, bool),
  notation: Notation.Infix,
});
```
When you don't care what the error is, you can just test for `''`.

In case the tables are too restrictive for your test, and you need an evaluation.
You should still use the `generalEvaluate` function from [generalEvaluation.ts](test/util/generalEvaluation.ts).
This function will automatically run both async and sync when possible.
This increases your tests' coverage.
