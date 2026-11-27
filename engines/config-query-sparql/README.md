# Comunica SPARQL Config

[![npm version](https://badge.fury.io/js/%40comunica%2Fconfig-query-sparql.svg)](https://www.npmjs.com/package/@comunica/config-query-sparql)
[![Node.js versions](https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fcomunica%2Fcomunica%2Fmaster%2F.github%2Fworkflows%2Fci.yml&query=%24.jobs.test.strategy.matrix%5B%27node-version%27%5D&label=node.js)](https://github.com/comunica/comunica/blob/master/.github/workflows/ci.yml)

The default configuration files for [Comunica SPARQL](https://github.com/comunica/comunica/tree/master/packages/query-sparql#readme).

This package should be used if you want to create your own Comunica query configuration, and build upon the default SPARQL configurations.

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Installation

```bash
$ yarn add @comunica/config-query-sparql
```

## Usage

Your own config file can build upon the config files of this package by importing them with the `ccqs:` prefix.

The following entry configs correspond to the default engines:

| Entry config          | Engine                                                                                                                  |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------|
| `config-default`      | [`@comunica/query-sparql`](https://github.com/comunica/comunica/tree/master/engines/query-sparql)                       |
| `config-file`         | [`@comunica/query-sparql-file`](https://github.com/comunica/comunica/tree/master/engines/query-sparql-file)             |
| `config-file-browser` | The browser variant of `@comunica/query-sparql-file`                                                                    |
| `config-rdfjs`        | [`@comunica/query-sparql-rdfjs`](https://github.com/comunica/comunica/tree/master/engines/query-sparql-rdfjs)           |
| `config-rdfjs-lite`   | [`@comunica/query-sparql-rdfjs-lite`](https://github.com/comunica/comunica/tree/master/engines/query-sparql-rdfjs-lite) |

Each entry config exists in several versions, such as `config/config-default.json` and `config/config-default-v5-4-1.json`.
Within a major version, no actors are added to existing files.
Instead, actors that are added in a minor release are placed in new versioned files.
So build upon the file with the **highest version** that exists in the version of this package that you depend on:

```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/config-query-sparql/^5.0.0/components/context.jsonld"
  ],
  "import": [
    "ccqs:config/config-default-v5-4-1.json"
  ]
}
```

**Do not import the config files of engine packages**, such as `config/config-default.json` in `@comunica/query-sparql`.
Those files are internal to their engine.
They point to the newest versioned file of this package, and are changed in minor releases whenever the engine gets new actors,
which can break your engine after an update.

[**Read more** about config versioning](https://comunica.dev/docs/modify/advanced/config_versioning/).

Guides on how to use these configuration files and package them into a new engine can be found on our [website](https://comunica.dev/docs/modify/).
