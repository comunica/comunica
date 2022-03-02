# Comunica Jest helpers

[![npm version](https://badge.fury.io/js/%40comunica%2Fjest.svg)](https://www.npmjs.com/package/@comunica/jest)

Jest test helpers for Comunica

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add --save-dev @comunica/jest
```

## Configuration

In order to use matchers in your tests,
you'll have to make sure that they are imported.
This can be done by adding the following entry to your Jest configuration:
```json
"jest": {
  "setupFilesAfterEnv": [ "@comunica/jest" ]
}
```

If you are already using an existing test framework script file,
make sure to add @comunica/jest as follows to your file:
```javascript
...
require('@comunica/jest');
```

## _Optional: Typescript typings configuration_

If you are using TypeScript, possibly in combination with [ts-jest](https://www.npmjs.com/package/ts-jest),
you will need to import the typings of this package to make the TS compiler recognise the new matchers.

For this, include the following import at the top of each applicable test file:
```
import "@comunica/jest";
```

## API

All examples below make use of these helpers:

```js
import { BindingsFactory } from '@comunica/bindings-factory';
import { DataFactory } from 'rdf-data-factory';

const BF = new BindingsFactory();
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
