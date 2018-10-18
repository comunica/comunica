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
evaluator.evaluate(bindings)
  .then((term) => console.log(term));

// or evaluate it as an Effective Boolean Value
evaluator.evaluateAsEBV(bindings)
  .then((result) => { if (result) => console.log(bindings);})
```

Note: If you want to use *aggregates*, or *exists* you should check out the [stream section](#streams).

### Errors

Sparqlee exports an Error class called `ExpressionError` from which all SPARQL related errors inherit. These might include unbound variables, wrong types, invalid lexical forms, and much more. More info on errors [here](lib/util/Errors.ts).

```ts
// Make sure to catch errors if you don't control binding input
evaluator.evaluate(bindings)
  .then(consumeResult)
  .catch((error) => {
    if (error instanceof ExpressionError) {
        console.log(error); // SPARQL related errors
    } else {
        throw error; // programming errors or missing features.
    }
  });
```

### Streams

'Aggregates' and 'Exists' operations are annoying problems to tackle in the context of an expression evaluator, since they make the whole thing statefull.
They might span entire streams and, depending on the use case, have very different requirements for speed and memory consumption. Sparqlee has therefore decided to delegate this responsibility back to you (and might provide utility in the future). It accepts functions that will resolve the respective aggregate and exists operators, and will use those when needed. This way, the library can still be optimized for simple use cases, both in it's API as in it's development time, while it can still support the full spec.

**NOTE: Aggregates and Exists are not implemented yet.**

## Spec compliance

**TODO** Add section about differences from the spec and which functions are affected (and which are implemented).

## Setup locally

1. Install `yarn` (or `npm`) and `node`.
2. Run `yarn install`.
3. Use these evident commands (or check `package.json`):
    * building once: `yarn run build`
    * build and watch: `yarn run watch`
    * testing: `yarn run test`
    * benchmarking: `yarn run bench`

### Adding missing functions

Functions are defined in the [definitions file]("lib/core/functions/Definitions.ts), and you can add them there. You also need to define it as an operator [here](lib/util/Errors.ts). The type system might be a bit cumbersome, so definitely check the [helpers](lib/core/functions/Helpers.ts) and existing definitions.

Three kinds exists:

* Overloaded functions: where multiple types are allowed, and implementation might be dependant on the actual types.
* Special functions: whose behaviour deviates enough from the norm to warrant the implementations taking full control over type checking and evaluation (these are mostly the functional forms).

**TODO**: Explain this hot mess some more.

### Testing

Running tests will generate a `test-report.html` in the root dir.
**TODO** Explain test organizatian and expression tables
