# Comunica Query Operation

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-query-operation.svg)](https://www.npmjs.com/package/@comunica/actor-init-query-operation)

An example init actor for Comunica that triggers an Query Operation event.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn add @comunica/actor-init-query-operation
```

## Usage

The `config/` folder contains an examples on how to run this actor,
which will trigger on the Runner's 'init' event.

As defined by `components/ActorInitQueryOperation`,
the actor allows an optional query operation parameter to be changed.

When executed, the actor will take the query operation JSON from the first CLI parameter,
or take it from the config file if not available,
evaluate the operation, and print its response to stdout.

When `@comunica/runner-cli`, `@comunica/runner` and the appropriate actor modules are installed,
executing the following:

```
$ node_modules/.bin/comunica-run config/config-example.json
```

will print the response.

**Note: when running in a dev environment:**
Make sure that your `NODE_PATH` contains the `node_modules` folder of this module.
