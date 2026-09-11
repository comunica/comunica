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
Create the engine once and reuse it, as it caches resolved function overloads.

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

```typescript
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';

const evaluator = await engine.createEvaluator(expression, new ActionContext({
  [KeysInitQuery.queryTimestamp.name]: new Date('2009-02-13T23:31:30Z'),
}));
```

### Limitations

* Evaluation is asynchronous only; there is no synchronous evaluator.
* `EXISTS` is not supported, as this engine configures no query operations.
