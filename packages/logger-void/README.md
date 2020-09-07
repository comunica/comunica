# Comunica Bus SPARQL Parse

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-sparql-parse.svg)](https://www.npmjs.com/package/@comunica/bus-sparql-parse)

A logger that voids all log messages.

**[Click here to learn more about logging](https://comunica.dev/docs/modify/advanced/logging/).**

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/logger-void
```

## Usage

```typescript
const newEngine = require('@comunica/actor-init-sparql').newEngine;
import {LoggerVoid} from "@comunica/logger-void";

const result = await myEngine.query('SELECT * WHERE { ?s ?p ?o }', {
  sources: ['http://fragments.dbpedia.org/2015/en'],
  log: new LoggerVoid(),
});
```
