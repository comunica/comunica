# Comunica Vitest helpers

[![npm version](https://badge.fury.io/js/%40comunica%2Futils-jest.svg)](https://www.npmjs.com/package/@comunica/utils-jest)

Vitest test helpers for Comunica

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add --save-dev @comunica/utils-jest
```

## Configuration

The matchers and test tables use Vitest's global `expect` and `test`,
so `globals` must be enabled in your Vitest configuration.
In order to use matchers in your tests,
you'll also have to make sure that they are imported.
This can be done by adding the following entries to your Vitest configuration:
```javascript
export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['@comunica/utils-jest'],
  },
});
```

Alternatively, include the following import at the top of each applicable test file,
which also makes the TypeScript compiler recognise the new matchers:
```
import "@comunica/utils-jest";
```

## API

All examples below make use of these helpers:

```js
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { DataFactory } from 'rdf-data-factory';

const BF = new BindingsFactory(DF);
const DF = new DataFactory();
```

#### toEqualBindings

Check if two Bindings are equal.

```js
expect(BF.bindings([
  [ DF.variable('a'), DF.namedNode('a1') ],
  [ DF.variable('b'), DF.namedNode('b1') ],
])).toEqualBindings(BF.bindings([
  [ DF.variable('a'), DF.namedNode('a1') ],
  [ DF.variable('b'), DF.namedNode('b1') ],
]));
```

#### toEqualBindingsArray

Check if two Bindings arrays are equal.

```js
expect([
  BF.bindings([
    [ DF.variable('a'), DF.namedNode('a1') ],
    [ DF.variable('b'), DF.namedNode('b1') ],
  ]),
  BF.bindings([
    [ DF.variable('b'), DF.namedNode('b1') ],
    [ DF.variable('c'), DF.namedNode('c1') ],
  ]),
]).toEqualBindingsArray([
  BF.bindings([
    [ DF.variable('a'), DF.namedNode('a1') ],
    [ DF.variable('b'), DF.namedNode('b1') ],
  ]),
  BF.bindings([
    [ DF.variable('b'), DF.namedNode('b1') ],
    [ DF.variable('c'), DF.namedNode('c1') ],
  ]),
]);
```

#### toEqualBindingsStream

Check if a Bindings stream equals a Bindings array.

```js
import { ArrayIterator } from 'asynciterator';

expect(new ArrayIterator([
  BF.bindings([
    [ DF.variable('a'), DF.namedNode('a1') ],
    [ DF.variable('b'), DF.namedNode('b1') ],
  ]),
  BF.bindings([
    [ DF.variable('b'), DF.namedNode('b1') ],
    [ DF.variable('c'), DF.namedNode('c1') ],
  ]),
], { autoStart: false })).toEqualBindingsStream([
  BF.bindings([
    [ DF.variable('a'), DF.namedNode('a1') ],
    [ DF.variable('b'), DF.namedNode('b1') ],
  ]),
  BF.bindings([
    [ DF.variable('b'), DF.namedNode('b1') ],
    [ DF.variable('c'), DF.namedNode('c1') ],
  ]),
]);
```

#### toBeRdfIsomorphic

Check if two RDF graphs are isomorphic.

```js
expect([ quadA1, quadA2 ]).toBeRdfIsomorphic([ quadB1, quadB2 ]);
```

#### toEqualRdfTerm

Check if two RDF terms are equal, ignoring the labels of blank nodes.

```js
expect(DF.namedNode('ex:s')).toEqualRdfTerm(DF.namedNode('ex:s'));
```

#### toEqualRdfQuad

Check if two RDF quads are equal, ignoring the labels of blank nodes.

```js
expect(quadA).toEqualRdfQuad(quadB);
```

#### toEqualRdfQuadArray

Check if two RDF quad arrays are equal, ignoring the labels of blank nodes.

```js
expect([ quadA1, quadA2 ]).toEqualRdfQuadArray([ quadB1, quadB2 ]);
```

## Expression evaluation test tables

Tests for [expression evaluation](https://comunica.dev/docs/modify/advanced/expression-evaluator/) functions
are written as tables, where every line is one test.
`runFuncTestTable` registers the function factory actors under test, and runs the table against them:

```typescript
import { bool, merge, numeric, Notation, runFuncTestTable } from '@comunica/utils-jest';
import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';

runFuncTestTable({
  registeredActors: [ args => new ActorFunctionFactoryTermEquality(args) ],
  testTable: `
    3i 3i = true
    3i -5i = false
    -0f 0f = true
    NaN NaN = false
  `,
  arity: 2,
  operation: '=',
  aliases: merge(numeric, bool),
  notation: Notation.Infix,
});
```

Aliases map the short names in the table to full RDF terms; the ones above are exported by this package.
Instead of a `testTable`, an `errorTable` asserts that evaluation throws, where `''` accepts any error:

```typescript
runFuncTestTable({
  errorTable: `3i 3i = 'Unknown named operator'`,
  arity: 2,
  operation: '<https://example.org/functions#equal>',
  aliases: numeric,
  notation: Notation.Infix,
});
```

The remaining options are documented on the `FuncTestTableConfig` type.
When a table is too restrictive, use `generalEvaluate` instead, which evaluates a full expression string.
