# Comunica Bus SPARQL Parse

[![npm version](https://badge.fury.io/js/%40comunica%2Flogger-pretty.svg)](https://www.npmjs.com/package/@comunica/logger-pretty)

A logger that prints to standard output.

**[Click here to learn more about logging](https://comunica.dev/docs/modify/advanced/logging/).**

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/logger-pretty
```

## Usage

```typescript
const QueryEngine = require('@comunica/query-sparql').QueryEngine;
import {LoggerPretty} from "@comunica/logger-pretty";

const bindingsStream = await new QueryEngine().queryBindings('SELECT * WHERE { ?s ?p ?o }', {
  sources: ['http://fragments.dbpedia.org/2015/en'],
  log: new LoggerPretty({ level: 'debug' }),
});
```
