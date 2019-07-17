# Comunica SPARQL File Init Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-sparql-file.svg)](https://www.npmjs.com/package/@comunica/actor-init-sparql-file)

A comunica SPARQL File Init Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn global add @comunica/actor-init-sparql-file
```

or

```bash
$ npm install -g @comunica/actor-init-sparql-file
```

## Usage from the command line

Show 100 triples from a remote FOAF profile:

```bash
$ comunica-sparql-file https://ruben.verborgh.org/profile/#me "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Show 100 triples from a local RDF file:

```bash
$ comunica-sparql-file path/to/my/file.ttl "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Show all triples from a local and remote file:

```bash
$ comunica-sparql-file path/to/my/file.ttl https://ruben.verborgh.org/profile/#me "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Show the help with all options:

```bash
$ comunica-sparql-file --help
```

Just like [Comunica SPARQL](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql),
a [dynamic variant](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql#usage-from-the-command-line) (`comunica-dynamic-sparql-file`) also exists.

### Usage within application

This engine can be used in JavaScript/TypeScript applications as follows:

```javascript
const newEngine = require('@comunica/actor-init-sparql-file').newEngine;
const myEngine = newEngine();

const result = await myEngine.query('SELECT * WHERE { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
  { sources: ['/path/to/my/file.ttl'] })
result.bindingsStream.on('data', (data) => console.log(data.toObject()));
```

[More details](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql#usage-within-application)

### Usage as a SPARQL endpoint

Start a webservice exposing http://fragments.dbpedia.org/2015-10/en via the SPARQL protocol, i.e., a _SPARQL endpoint_.

```bash
$ comunica-sparql-file-http "{ \"sources\": [\"/path/to/my/file.ttl\"]}"
```

Show the help with all options:

```bash
$ comunica-sparql-file-http --help
```

The SPARQL endpoint can only be started dynamically.
An alternative config file can be passed via the `COMUNICA_CONFIG` environment variable.

Use `bin/http.js` when running in the Comunica monorepo development environment.
