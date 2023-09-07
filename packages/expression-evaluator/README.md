# Comunica Expression Evaluator

[![npm version](https://badge.fury.io/js/%40comunica%2Fexpression-evaluator.svg)](https://www.npmjs.com/package/@comunica/expression-evaluator)

Previously called sparqlee - sparql expression evaluator. A simple spec-compliant SPARQL 1.1 expression evaluator package.

**[Learn more about the expression evaluator](https://comunica.dev/docs/modify/advanced/expression-evaluator/).**

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/expression-evaluator
```

## Exposed classes

* [`AsyncEvaluator`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.AsyncEvaluator.html): An evaluator for SPARQL expressions working with Promises.
* [`IAsyncEvaluatorContext`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.IAsyncEvaluatorContext.html): Context used to configure the `AsyncEvaluator`. See [Config](https://comunica.dev/docs/modify/advanced/expression-evaluator/#config). 
* [`SyncEvaluator`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.SyncEvaluator.html): An evaluator for SPARQL expressions working without Promises.
* [`ISyncEvaluatorContext`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.ISyncEvaluatorContext.html): Context used to configure the `SyncEvaluator`. See [Config](https://comunica.dev/docs/modify/advanced/expression-evaluator/#config).
* [`AggregateEvaluator`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.AggregateEvaluator.html): An evaluator for SPARQL aggregate expressions working without promises. See [Aggregates](https://comunica.dev/docs/modify/advanced/expression-evaluator/#aggregates).
* [`ExpressionError`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.ExpressionError.html): An error class for SPARQL expression errors as defined in the [error section](https://comunica.dev/docs/modify/advanced/expression-evaluator/#errors).
* [`isExpressionError`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.isExpressionError.html): A way to check if an error is of type `ExpressionError`.
* [`orderTypes`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.orderTypes.html): A function to order types according to the [SPARQL ORDER BY specification](https://www.w3.org/TR/sparql11-query/#modOrderBy).
* [`AsyncAggregateEvaluator`](https://comunica.github.io/comunica/classes/_comunica_expression_evaluator.AsyncAggregateEvaluator.html): An evaluator for SPARQL aggregate expressions working with promises. See [Aggregates](https://comunica.dev/docs/modify/advanced/expression-evaluator/#aggregates).


## Development

## Setup locally

1. Install `yarn` and `node`.
2. Run `yarn install`.
3. Use these evident commands (or check `package.json`):
    - building once: `yarn run build`
    - benchmarking: `yarn run bench`

### Adding or fixing functions

Functions are defined in the [functions directory](lib/functions), and you can add or fix them there.
All definitions are defined using a builder model defined in [Helpers.ts](lib/functions/Helpers.ts).

Three kinds exists:

- Regular functions: Functions with a uniform interface, that only need their arguments to calculate their result.
- Special functions: whose behaviour deviates enough from the norm to warrant the implementations taking full control
over type checking and evaluation (these are mostly the functional forms). 
They are seperated from the regular functions because they are able to take control over the evaluation.
Since we have support both async and sync evaluations, each having a distinct context, special functions require an implementation for both.
For regular functions, the sync and async evaluation is the same, to avoid overhead, we differentiate between these two.
- Named functions: which correspond to the SPARQLAlgebra Named Expressions.

### Layout and control flow

The only important external facing API is creating an Evaluator.
When you create one, the SPARQL Algebra expression that is passed will be transformed to an internal representation (see [AlgebraTransformer.ts](./lib/transformers/AlgebraTransformer.ts)).
This will build objects (see [expressions module](./lib/expressions)) that contain all the logic and data for evaluation,
for example the implementations for SPARQL functions (see [functions module](./lib/functions)).
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
```ts
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
```ts
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
