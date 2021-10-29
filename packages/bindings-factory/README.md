# Comunica Bindings Factory

This package provides a factory for `Bindings` objects, which allow variables to be mapped to RDF terms.

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
const bindings: Bindings = BF.bindings({ '?var': DF.literal('abc') });
```
