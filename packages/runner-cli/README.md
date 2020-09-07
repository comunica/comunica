# Comunica Runner CLI

[![npm version](https://badge.fury.io/js/%40comunica%2Frunner-cli.svg)](https://www.npmjs.com/package/@comunica/runner-cli)

Command line runner module for Comunica actors on the [Init bus](https://github.com/comunica/comunica/tree/master/packages/bus-init).

Builds upon [`@comunica/runner`](https://github.com/comunica/comunica/tree/master/packages/runner).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

[Learn more about creating a custom init actor](https://comunica.dev/docs/modify/getting_started/custom_init/).

## Install

```bash
$ yarn add @comunica/runner-cli
```

## Usage from the command line

```bash
$ comunica-run config.json [args...]
```

### Usage from an application

Static:
```typescript
#!/usr/bin/env node
import { runArgsInProcessStatic } from '@comunica/runner-cli';
runArgsInProcessStatic(require('../engine-default.js'));
```

Dynamic:
```typescript
#!/usr/bin/env node
import { runArgsInProcess } from '@comunica/runner-cli';
runArgsInProcess(`${__dirname}/../`, `${__dirname}/../config/config-default.json`);
```
