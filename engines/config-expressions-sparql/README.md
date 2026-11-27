# Comunica SPARQL Expressions Config

[![npm version](https://badge.fury.io/js/%40comunica%2Fconfig-expressions-sparql.svg)](https://www.npmjs.com/package/@comunica/config-expressions-sparql)
[![Node.js versions](https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fcomunica%2Fcomunica%2Fmaster%2F.github%2Fworkflows%2Fci.yml&query=%24.jobs.test.strategy.matrix%5B%27node-version%27%5D&label=node.js)](https://github.com/comunica/comunica/blob/master/.github/workflows/ci.yml)

The default configuration files for [Comunica SPARQL Expressions](https://github.com/comunica/comunica/tree/master/engines/expressions-sparql#readme).
They reuse the expression evaluation parts of [`@comunica/config-query-sparql`](https://github.com/comunica/comunica/tree/master/engines/config-query-sparql#readme).

This package should be used if you want to create your own expression evaluation configuration, and build upon the default configuration.

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Installation

```bash
$ yarn add @comunica/config-expressions-sparql
```

## Usage

Your own config file can build upon the config files of this package by importing them with the `cces:` prefix.

The entry config `config-expressions` exists in several versions, such as `config/config-expressions.json` and `config/config-expressions-v5-5-0.json`.
Within a major version, no actors are added to existing files.
So build upon the file with the **highest version** that exists in the version of this package that you depend on:

```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/config-expressions-sparql/^5.0.0/components/context.jsonld"
  ],
  "import": [
    "cces:config/config-expressions-v5-5-0.json"
  ]
}
```

**Do not import the config files of engine packages**, such as `config/config-default.json` in `@comunica/expressions-sparql`.
Those files are internal to their engine, and are changed in minor releases whenever the engine gets new actors,
which can break your engine after an update.

[**Read more** about config versioning](https://comunica.dev/docs/modify/advanced/config_versioning/).

Guides on how to use these configuration files and package them into a new engine can be found on our [website](https://comunica.dev/docs/modify/).
