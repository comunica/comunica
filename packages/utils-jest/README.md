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

In order to use matchers in your tests,
you'll have to make sure that they are imported.
This can be done by adding the following entry to your Vitest configuration:
```javascript
export default defineConfig({
  test: {
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
