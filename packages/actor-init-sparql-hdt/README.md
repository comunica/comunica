# Comunica SPARQL HDT Init Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-sparql-hdt.svg)](https://www.npmjs.com/package/@comunica/actor-init-sparql-hdt)

A comunica SPARQL [HDT](http://www.rdfhdt.org/) Init Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn add @comunica/actor-init-sparql-hdt
```

## Usage

Show 100 triples from a HDT file:

```bash
$ comunica-sparql-hdt hdtFile@myfile.hdt "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Show the help with all options:

```bash
$ comunica-sparql-hdt --help
```
