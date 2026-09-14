# Comunica SPARQL Expressions

[![npm version](https://badge.fury.io/js/%40comunica%2Fexpressions-sparql.svg)](https://www.npmjs.com/package/@comunica/expressions-sparql)

Comunica SPARQL Expressions evaluates SPARQL expressions, aggregates and term ordering
without setting up a query engine.

This module is part of the [Comunica framework](https://comunica.dev/).

**[Learn more about expression evaluation](https://comunica.dev/docs/modify/advanced/expression-evaluator/).**

## Install

```bash
$ yarn add @comunica/expressions-sparql
```

## Usage

All inputs are [SPARQL algebra](https://github.com/comunica/comunica/tree/master/packages/utils-algebra#readme)
expressions, and all evaluation is asynchronous.
`ExpressionEngine` implements `IExpressionEngine` from `@comunica/types`, which is what your own code should depend on.
Create the engine once and reuse it, as it shares a `functionArgumentsCache` across everything it creates.
Callers that vary the `superTypeProvider` between calls must not share that cache, see [Context](#context).

```typescript
import { ExpressionEngine } from '@comunica/expressions-sparql';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { toAlgebra } from '@traqula/algebra-sparql-1-2';
import { Parser } from '@traqula/parser-sparql-1-2';
import { DataFactory } from 'rdf-data-factory';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const engine = new ExpressionEngine();

// Parse a query, and take the expression of its FILTER clause
const query: any = toAlgebra(new Parser().parse(`
  SELECT * WHERE { ?s ?p ?o FILTER(langMatches(lang(?o), "FR")) }
`));
const evaluator = await engine.createEvaluator(query.input.expression);

// Evaluate bindings as a term, ...
const term = await evaluator.evaluate(BF.fromRecord({ o: DF.literal('Ceci n\'est pas une pipe', 'fr') }));
// ... or as an effective boolean value, as FILTER does
const ebv = await evaluator.evaluateAsEBV(BF.fromRecord({ o: DF.literal('This is not a pipe', 'en') }));
```

Expressions can also be parsed on their own, as Traqula can start parsing from any grammar rule,
and translate any part of the resulting syntax tree to algebra:

```typescript
import { toAlgebra12Builder } from '@traqula/algebra-sparql-1-2';
import { createAlgebraContext } from '@traqula/algebra-transformations-1-2';
import { sparql12ParserBuilder } from '@traqula/parser-sparql-1-2';
import { completeParseContext, lex } from '@traqula/rules-sparql-1-2';

// Build the parser once and reuse it, as building it is expensive
const parser = sparql12ParserBuilder.build({ tokenVocabulary: lex.sparql12LexerBuilder.tokenVocabulary });
const translator = toAlgebra12Builder.build();

// Parse from the Expression grammar rule, and translate the result
const prefixes = { xsd: 'http://www.w3.org/2001/XMLSchema#' };
const ast = parser.expression('xsd:integer(?age) >= 18', completeParseContext({ prefixes }));
const expression = translator.translateExpression(createAlgebraContext({ prefixes }), ast);

const isAdult = await engine.createEvaluator(expression);
await isAdult.evaluateAsEBV(BF.fromRecord({ age: DF.literal('21') })); // true
```

Prefixes are checked while parsing and expanded while translating, so both contexts need them.
An aggregate such as `SUM(?x)` only parses if the `parseMode` of the parse context includes `canParseAggregate`.
`createAlgebraContext` ignores the `quads` and `blankToVariable` options that `toAlgebra` applies,
so the pattern of an `EXISTS` keeps its `GRAPH` operations and blank nodes.

Terms can be ordered as `ORDER BY` does:

```typescript
const comparator = await engine.createTermComparator();
comparator.orderTypes(DF.literal('a'), DF.literal('b')); // -1
```

And bindings can be aggregated:

```typescript
import { AlgebraFactory } from '@comunica/utils-algebra';

const AF = new AlgebraFactory(DF);
const aggregator = await engine.createAggregator(
  AF.createAggregateExpression('sum', AF.createTermExpression(DF.variable('x')), false),
);
await aggregator.putBindings(bindings);
const result = await aggregator.result();
```

### Context

Every method takes an optional [`IActionContext`](https://github.com/comunica/comunica/tree/master/packages/core#readme)
configuring the evaluation, such as `KeysInitQuery.extensionFunctions` or `KeysExpressionEvaluator.defaultTimeZone`.
The [expression evaluator documentation](https://comunica.dev/docs/modify/advanced/expression-evaluator/#config)
lists all keys.
Entries that are required but absent (`dataFactory`, `queryTimestamp` and `functionArgumentsCache`) are defaulted.

The `functionArgumentsCache` defaults to one instance shared by every evaluator, comparator and aggregator this
engine creates. That cache records which function implementation a combination of argument datatypes resolved to,
and that resolution depends on `KeysExpressionEvaluator.superTypeProvider`. Passing a different super-type
provider therefore requires a fresh cache, or the first provider's resolutions are served to the second one:

```typescript
const evaluator = await engine.createEvaluator(expression, new ActionContext({
  [KeysExpressionEvaluator.superTypeProvider.name]: myProvider,
  [KeysInitQuery.functionArgumentsCache.name]: {},
}));
```

```typescript
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';

const evaluator = await engine.createEvaluator(expression, new ActionContext({
  [KeysInitQuery.queryTimestamp.name]: new Date('2009-02-13T23:31:30Z'),
}));
```

### EXISTS

This engine configures no query operations, so it cannot evaluate the sub-query of an `EXISTS` itself.
Supply a `KeysExpressionEvaluator.existenceResolver` to answer them; without one, evaluating an `EXISTS`
throws. The resolver receives the expression as it appears in the algebra, which makes it responsible for
applying `expression.not` and, if it needs them, for substituting the bindings with `materializeOperation`:

```typescript
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { materializeOperation } from '@comunica/utils-query-operation';

const evaluator = await engine.createEvaluator(expression, new ActionContext({
  [KeysExpressionEvaluator.existenceResolver.name]:
    async(expr: Algebra.ExistenceExpression, bindings: RDF.Bindings) => {
      const operation = materializeOperation(expr.input, bindings, AF, BF);
      const exists = await myStore.ask(operation);
      return expr.not ? !exists : exists;
    },
}));
```

A resolver may throw an `ExpressionError` (from `@comunica/utils-expression-evaluator`) to mark the failure as a
SPARQL error rather than a programmer error. This engine evaluates no `FILTER` of its own, so acting on that
distinction is up to the caller, through `isExpressionError`.

### Limitations

* Evaluation is asynchronous only; there is no synchronous evaluator.
