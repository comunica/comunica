# Comunica Packager

[![npm version](https://badge.fury.io/js/%40comunica%2Fpackager.svg)](https://www.npmjs.com/package/@comunica/packager)

A tool for generating a dependency list from a config file.

This tool can be used if you want to create a custom Comunica config and query engine.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/packager
```

## Usage

### Generating a dependency list

```bash
$ comunica-package -c config/config-default.json
```

Example output:
```text
{
  "@comunica/actor-context-preprocess-source-to-destination": "^2.0.0",
  "@comunica/actor-hash-bindings-sha1": "^2.0.0",
  "@comunica/actor-http-fetch": "^2.0.0",
  "@comunica/actor-http-proxy": "^2.0.0",
  "@comunica/actor-init-query": "^2.0.0",
...
```

This will output a list of dependencies that can be included in your `package.json` file.

### Initializing a new package

```bash
$ comunica-package -c config/config-default.json -o my-sparql-engine 
```

This will create a directory `my-sparql-engine` containing new `package.json` and `index.js` files.

### Note on additional dependencies

If you are extending from a config in `@comunica/config-query-sparql`,
make sure to include `@comunica/config-query-sparql` as a dependency as well.

If you include a `bin/` directory, you may also want to include `@comunica/runner-cli` as dependency.
