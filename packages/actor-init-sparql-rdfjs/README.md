# Comunica SPARQL RDFJS Init Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-sparql-rdfjs.svg)](https://www.npmjs.com/package/@comunica/actor-init-sparql-rdfjs)

A comunica SPARQL RDFJS Init Actor that can query RDFJS sources
that implement the [Source interface](http://rdf.js.org/#source-interface).

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

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
  { sources: [ { type: 'rdfjsSource', value: store } ] });
result.bindingsStream.on('data', (data) => {
  // Each data object contains a mapping from variables to RDFJS terms.
  console.log(data.get('?s'));
  console.log(data.get('?p'));
  console.log(data.get('?o'));
});
```
