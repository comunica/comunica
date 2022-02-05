# Comunica Bindings Factory

This package provides a factory for `Bindings` objects, which allow variables to be mapped to RDF terms.

Internally, it makes use of [`immutable`](https://www.npmjs.com/package/immutable)
to make sure that `set` and `delete` operations reuse internal memory when possible.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bindings-factory
```

## Usage

```typescript
import type { Bindings } from '@comunica/types';
import { DataFactory } from '@comunica/data-factory';
import { BindingsFactory } from '@comunica/bindings-factory';

const DF = new DataFactory();
const BF = new BindingsFactory();
const bindings: Bindings = BF.bindings([
  [ DF.variable('var1'), DF.literal('abc') ],
  [ DF.variable('var2'), DF.literal('def') ],
]);
```
