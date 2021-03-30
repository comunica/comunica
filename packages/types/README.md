# Comunica Types

A collection of reusable Comunica Typescript interfaces and types.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/types
```

## Usage

```typescript
import { Bindings } from '@comunica/types';

// ...

const bindings: Bindings = Bindings({ '?var': dataFactory.literal('abc') });
```

All types are available in [`index.ts`](https://github.com/comunica/comunica/blob/master/packages/context-entries/index.ts).
