# Comunica Expression Evaluator Utils

[![npm version](https://badge.fury.io/js/%40comunica%2Futils-expression-evaluator.svg)](https://www.npmjs.com/package/@comunica/utils-expression-evaluator)

The building blocks that the SPARQL expression evaluation actors of Comunica are made of:
the internal term representation, the type system, and the errors of expression evaluation.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

To evaluate expressions rather than implement them, use
[Comunica SPARQL Expressions](https://github.com/comunica/comunica/tree/master/engines/expressions-sparql#readme).

**[Learn more about expression evaluation](https://comunica.dev/docs/modify/advanced/expression-evaluator/).**

## Install

```bash
$ yarn add @comunica/utils-expression-evaluator
```

## Exposed

* Expressions: `Term` and its subclasses (`Literal`, `NumericLiteral`, `LangStringLiteral`, `DateTimeLiteral`, ...),
  `Operator`, `Aggregate`, `Existence` and `Variable`, the representation that evaluation works on,
  together with the `TermTransformer` that creates terms from RDF/JS terms.
* `declare` and its `Builder`: define a function with overloads, backed by an `OverloadTree`
  that resolves the implementation matching the argument types.
* The type system: `TypeURL`, `TypeAlias`, `KnownLiteralTypes`, `isSubTypeOf` and `typedLiteral`.
* The operator names known to Comunica: `SparqlOperator`, `NamedOperator`, `KnownOperator` and `GeneralOperator`.
* `ExpressionError` and its subclasses, together with `isExpressionError` to recognize them.
  These are the errors that are expected during evaluation, and that `FILTER` and `ORDER BY` respond to differently.
* Lexical form parsers and date arithmetic: `parseDateTime`, `parseDuration`, `toUTCDate`,
  `addDurationToDateTime`, ...
* `prepareEvaluatorActionContext`: derives the context entries an evaluator needs from the ones it was given.

## Layout and control flow

SPARQL algebra expressions are transformed into the internal representation of this package by the
[`AlgebraTransformer`](../actor-expression-evaluator-factory-default/lib/AlgebraTransformer.ts),
after which the evaluator recursively evaluates them.

Tests for functions built on these utilities are written as test tables;
see [`@comunica/utils-jest`](../utils-jest/README.md#expression-evaluation-test-tables).
