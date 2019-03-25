# Sparqlee

[![Greenkeeper badge](https://badges.greenkeeper.io/comunica/sparqlee.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/comunica/sparqlee.svg?branch=master)](https://travis-ci.org/comunica/sparqlee)
[![Coverage Status](https://coveralls.io/repos/github/comunica/sparqlee/badge.svg?branch=master)](https://coveralls.io/github/comunica/sparqlee?branch=master)
[![Gitter chat](https://badges.gitter.im/comunica.png)](https://gitter.im/comunica/Lobby)

A simple SPARQL expression evaluator library.

This package is available on [npm](https://www.npmjs.com/package/sparqlee), type definitions are provided.

## Using Sparqlee

```ts
const expression = ...some sparql algebra expression...;
const bindings = ...some bindings/solution mapping...;

// Create an evaluator (a sync evaluator will exist in the future too)
const evaluator = new AsyncEvaluator(expression)

// evaluate it as a term
const result: RDF.Term = await evaluator.evaluate(bindings);

// or evaluate it as an Effective Boolean Value (for e.g in FILTER)
const result: boolean = await evaluator.evaluateAsEBV(bindings);

```

Note: If you want to use *aggregates*, or *exists* you should check out the [stream section](#streams).

### Errors

Sparqlee exports an Error class called `ExpressionError` from which all SPARQL related errors inherit. These might include unbound variables, wrong types, invalid lexical forms, and much more. More info on errors [here](lib/util/Errors.ts). These errors can be caught, and may impact program execution in an expected way. All other errors are unexpected, and are thus programmer mistakes or mistakes in this library.

There is also the utility function `isExpressionError` for detecting these cases.

```ts
// Make sure to catch errors if you don't control binding input
try {
  const result = await evaluator.evaluate(bindings);
  consumeResult(result;)
} catch (error) {
  if (isExpressionError(error)) {
    console.log(error); // SPARQL related errors
    ...                 // Move on, ignore result, ...
  } else {
    throw error;        // Programming errors or missing features.
  }
}
```

### Streams

'Aggregates' and 'Exists' operations are annoying problems to tackle in the context of an expression evaluator, since they make the whole thing statefull.
They might span entire streams and, depending on the use case, have very different requirements for speed and memory consumption. Sparqlee has therefore decided to delegate this responsibility back to you.

You can, if you want, pass hooks to the evaluators of the shape:

```ts
export type AggregateHook = (expression: Alg.AggregateExpression) => Promise<RDF.Term>;
export type ExistenceHook = (expression: Alg.ExistenceExpression, mapping: Bindings) => Promise<boolean>;
```

If Sparqlee encounters any aggregate or existence expression, it will call this hook with the relevant information so you can resolve it yourself.

#### Aggregates

We provide an `AggregateEvaluator` to which you can pass the individual bindings in the stream, end ask the aggregated result back. It uses Sparqlee's internal type system for operations such as `sum` and `avg`.

```ts
const stream = [bindings1, bindings2, bindings3];

if (stream.length === 0) {
  return AggregateEvaluator.emptyValue(aggregateExpression);
} else {
  const evaluator = = new AggregateEvaluator(aggregateExpression, bindings[0]);
  stream.slice(1).forEach((bindings) => evaluator.put(bindings));
  return evaluator.result();
}
```

### Custom functions

**NOTE: Not yet implemented. On the roadmap.**

## Spec compliance

**TODO** Add section about differences from the spec and which functions are affected (and which are implemented). See also [extensible value testing and error handling](https://www.w3.org/TR/sparql11-query/#extensionFunctions).

**TODO** String literals (plain literals etc...)

**TODO** Replace with check marks

- _Implemented_: The function is at least partially implemented.
- _Tested_: There are tests for this function in this repo.
- _Passes spec_: Passes the spec tests (see [rdf-test-suite](https://github.com/rubensworks/rdf-test-suite.js)). We test this with [Comunica](https://github.com/comunica/comunica) manually (TODO).
- _Spec compliant_: Passes the spec tests, has local tests, and there is high confidence the function is fully spec compliant.

|    Function    | Implemented | Tested | Passes Spec |Spec compliant |
|----------------|-------------|--------|-------------|----------------|
| [Operator Mapping](https://www.w3.org/TR/sparql11-query/#OperatorMapping)
| ! (not)        | ✓ | ✓ |   | ✓ |
| + (unary plus) | ✓ | ✓ |   |   |
| - (unary minus)| ✓ | ✓ |   |   |
| \|\|           | ✓ | ✓ |   |   |
| &&             | ✓ | ✓ |   |   |
| =              | ✓ | ✓ |   |   |
| !=             | ✓ | ✓ |   |   |
| <              | ✓ | ✓ |   |   |
| >              | ✓ | ✓ |   |   |
| <=             | ✓ | ✓ |   |   |
| >=             | ✓ | ✓ |   |   |
| *              | ✓ | ✓ |   |   |
| /              | ✓ | ✓ |   |   |
| +              | ✓ | ✓ |   |   |
| -              | ✓ | ✓ |   |   |
| _Notes_        |   |   |   | Spec compliance depends on #13 and #14 |
| [Functional Forms](https://www.w3.org/TR/sparql11-query/#func-forms)
| BOUND          | ✓ |   |   |   |
| IF             | ✓ |   |   |   |
| COALESCE       | ✓ |   |   |   |
| NOT EXISTS     |   |   |   |   |
| EXISTS         |   |   |   |   |
| logical-or     | ✓ | ✓ |   | ✓ |
| logical-and    | ✓ | ✓ |   | ✓ |
| RDFTerm-equal  | ✓ | ✓ |   | ? |
| sameTerm       | ✓ |   |   |   |
| IN             | ✓ |   |   |   |
| NOT IN         | ✓ |   | ✓ |   |
| _Notes_        |   |   |   |   |
| [On RDF Terms](https://www.w3.org/TR/sparql11-query/#func-rdfTerms)
| isIRI          | ✓ |   |   |   |
| isBlank        | ✓ |   |   |   |
| isLiteral      | ✓ |   |   |   |
| isNumeric      | ✓ |   |   |   |
| str            | ✓ | ✓ |   | ✓ |
| lang           | ✓ | ✓ |   | ✓ |
| datatype       | ✓ | ✓ |   | ✓ |
| IRI            |   |   |   |   |
| BNODE          |   |   |   |   |
| STRDT          | ✓ |   | ✓ |   |
| STRLANG        | ✓ |   | X |   |
| UUID           | ✓ |   |   |   |
| STRUID         | ✓ |   |   |   |
| _Notes_        |   |   |   | STRLANG test case is wrong (different case for lang-tag)  |
| [On Strings](https://www.w3.org/TR/sparql11-query/#func-strings)
| STRLEN         | ✓ | ✓ |   |   |
| SUBSTR         | ✓ |   | ✓ |   |
| UCASE          | ✓ |   | ✓ |   |
| LCASE          | ✓ |   | ✓ |   |
| STRSTARTS      | ✓ |   | ✓ |   |
| STRENDS        | ✓ |   | ✓ |   |
| CONTAINS       | ✓ |   | ✓ |   |
| STRBEFORE      | ✓ |   | X |   |
| STRAFTER       | ✓ |   | ✓ |   |
| ENCODE_FOR_URI | ✓ |   | ✓ |   |
| CONCAT         | ✓ |   | ✓ |   |
| langMatches    | ✓ | ✓ |   | ? |
| REGEX          | ✓ | ✓ |   |   |
| REPLACE        |   |   |   |   |
| _Notes_        |   |   |   | STRBEFORE language handling sucks (2 test cases are incompatible in relation to empty strings and language tags). For LEN i can't spot the problem |
| [On Numerics](https://www.w3.org/TR/sparql11-query/#func-numerics)
| abs            | ✓ |   | ✓ |   |
| round          | ✓ |   | ✓ |   |
| ceil           | ✓ |   | ✓ |   |
| floor          | ✓ |   | ✓ |   |
| RAND           | ✓ |   | ✓ |   |
| _Notes         |   |   |   |   |
| [On Dates and Times](https://www.w3.org/TR/sparql11-query/#func-date-time)
| now            |   |   |   |   |
| year           | ✓ |   | ✓ |   |
| month          | ✓ |   | ✓ |   |
| day            | ✓ |   | ✓ |   |
| hours          | ✓ |   | ✓ |   |
| minutes        | ✓ |   | ✓ |   |
| seconds        | ✓ |   | ✓ |   |
| timezone       | ✓ |   | ✓ |   |
| tz             | ✓ |   | ✓ |   |
| _Notes_        |   |   |   |   |
| [Hash Functions](https://www.w3.org/TR/sparql11-query/#func-hash)
| MD5            | ✓ |   | ✓ | ✓ |
| SHA1           | ✓ |   | ✓ | ✓ |
| SHA256         | ✓ |   | ✓ | ✓ |
| SHA384         | ✓ |  | X |   |
| SHA512         | ✓ |   | ✓ | ✓ |
| _Notes_        |   |   |   | Sha384 has no spec tests |
| [XPath Constructor Functions](https://www.w3.org/TR/sparql11-query/#FunctionMapping)
| str (see 'On Terms') | ✓ | ✓ |   | ✓ |
| flt            | ✓ | ✓ |   |   |
| dbl            | ✓ | ✓ |   |   |
| dec            | ✓ | ✓ |   |   |
| int            | ✓ | ✓ |   |   |
| dT             | ✓ | ✓ |   |   |
| bool           | ✓ | ✓ |   |   |

## Development

## Setup locally

1. Install `yarn` (or `npm`) and `node`.
2. Run `yarn install`.
3. Use these evident commands (or check `package.json`):
    * building once: `yarn run build`
    * build and watch: `yarn run watch`
    * testing: `yarn run test`
    * benchmarking: `yarn run bench`

### Adding unimplemented functions

Functions are defined in the [functions directory](lib/functions/), and you can add them there. All definitions are defined using a builder model defined in [Helpers.ts](lib/functions/Helpers.ts).

Three kinds exists:

* Regular functions: Functions with a uniform interface, that only need their arguments to calculate their result.
* Special functions: whose behaviour deviates enough from the norm to warrant the implementations taking full control over type checking and evaluation (these are mostly the functional forms).
* Named functions: which correspond to the SPARQLAlgebra Named Expressions.

**TODO**: Explain this hot mess some more.

### Layout and control flow

The only important external facing API is creating an Evaluator.
When you create one, the SPARQL Algebra expression that is passed will be transformed to an internal representation (see [Transformation.ts](./lib/Transformation.ts)). This will build objects (see [expressions module](./lib/expressions)) that contain all the logic and data for evaluation, for example the implementations for SPARQL functions (see [functions module](./lib/functions)). After transformation, the evaluator will recursively evaluate all the expressions.

### Type System

[See functions/Core.ts](./lib/functions/Core.ts)

The type system is tailored for doing (supposedly) quick evaluation of overloaded functions. A function object consists of a map of argument types to a concrete function implementation for those argument types.

When a function object is called with some functions, it looks up a concrete implementation. If we can not find one, we consider the argument of invalid types.

Since many derived types exist, we also associate every literal with it's primitive datatype when constructing a literal. This handles **subtype substitution**, as we define allowed types in function of these primitives types. Note: the derived type is not maintained after operation, since I found no functions for which this was relevant.

**Type promotion** is handled in a couple of ways. Firstly, a bit like C++ vtables, if we can not find a implementation for the concrete (primitive) types, we try to find an implementation for the term-types of all the arguments, if that fails, we look for an implementation on generic terms.

We also handle type promotion by explicitly coding for it. This is done in the arithmetic functions `+, -, *, /`.

Lastly for types that do not occur in any SPARQL function definitions on themselves, we simply consider their primitive type to the type they can be promototed to. This happens for `anyUri` (considered a string).

### Testing

Running tests will generate a `test-report.html` in the root dir.
**TODO** Explain test organizatian and expression tables
