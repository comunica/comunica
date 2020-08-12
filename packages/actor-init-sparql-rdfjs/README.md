# Comunica SPARQL RDFJS Init Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-sparql-rdfjs.svg)](https://www.npmjs.com/package/@comunica/actor-init-sparql-rdfjs)

Comunica SPARQL is a SPARQL query engine for JavaScript for querying RDFJS sources
that implement the [Source interface](http://rdf.js.org/#source-interface).

This module is part of the [Comunica framework](https://comunica.dev/).

## Install

```bash
$ yarn add @comunica/actor-init-sparql-rdfjs
```

## Usage

```javascript
const newEngine = require('@comunica/actor-init-sparql-rdfjs').newEngine;
const N3Store = require('n3').Store;
const DataFactory = require('n3').DataFactory;

// This can be any RDFJS source
// In this example, we wrap an N3Store
const store = new N3Store();
store.addQuad(DataFactory.quad(
  DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Belgium')));
store.addQuad(DataFactory.quad(
  DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Ghent')));

// Create our engine, and query it.
// If you intend to query multiple times, be sure to cache your engine for optimal performance.
const myEngine = newEngine();
const result = await myEngine.query('SELECT * { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
  { sources: [store] });
result.bindingsStream.on('data', (data) => {
  // Each data object contains a mapping from variables to RDFJS terms.
  console.log(data.get('?s'));
  console.log(data.get('?p'));
  console.log(data.get('?o'));
});
```

_[**Read more** about querying an application](https://comunica.dev/docs/query/getting_started/query_app/)._

## Optimization

The RDFJS [Source interface](http://rdf.js.org/#source-interface) by default only exposed the `match` method.
In order to allow Comunica to produce more efficient query plans,
you can optionally expose a `countQuads` method that has the same signature as `match`,
but returns a `number` or `Promise<number>` that represents (an estimate of)
the number of quads that would match the given quad pattern.
Certain `Source` implementations may be able to provide an efficient implementation of this method,
which would lead to better query performance.

If Comunica does not detect a `countQuads` method, it will fallback to a sub-optimal counting mechanism
where `match` will be called again to manually count the number of matches.
