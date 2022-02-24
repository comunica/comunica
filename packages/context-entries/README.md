# Comunica Context Entries

[![npm version](https://badge.fury.io/js/%40comunica%2Fcontext-entries.svg)](https://www.npmjs.com/package/@comunica/context-entries)

A collection of reusable Comunica context key definitions.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/context-entries
```

## Usage

```typescript
import { KeysInitSparql } from '@comunica/context-entries';

// ...

const baseIRI = context.get(KeysInitSparql.baseIRI);
```

All available keys are available in [`Keys`](https://github.com/comunica/comunica/blob/master/packages/context-entries/lib/Keys.ts).
