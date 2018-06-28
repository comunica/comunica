# Comunica SPARQL File Init Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-sparql-file.svg)](https://www.npmjs.com/package/@comunica/actor-init-sparql-file)

A comunica SPARQL File Init Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn add @comunica/actor-init-sparql-file
```

## Usage

Show 100 triples from a FOAF profile:

```bash
$ comunica-sparql-file file@https://ruben.verborgh.org/profile/#me "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Show the help with all options:

```bash
$ comunica-sparql-file --help
```
