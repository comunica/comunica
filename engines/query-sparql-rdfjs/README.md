# Comunica SPARQL RDF/JS

[![npm version](https://badge.fury.io/js/%40comunica%2Fquery-sparql-rdfjs.svg)](https://www.npmjs.com/package/@comunica/query-sparql-rdfjs)

Comunica SPARQL is a SPARQL query engine for JavaScript for querying RDF/JS sources
that implement the [Source interface](http://rdf.js.org/#source-interface).

This module is part of the [Comunica framework](https://comunica.dev/).

## Install

```bash
$ yarn add @comunica/query-sparql-rdfjs
```

## Query

```typescript
const QueryEngine = require('@comunica/query-sparql-rdfjs').QueryEngine;
const N3Store = require('n3').Store;
const DataFactory = require('n3').DataFactory;

// This can be any RDFJS source
const store = new N3Store();
store.addQuad(DataFactory.quad(
  DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Belgium')));
store.addQuad(DataFactory.quad(
  DataFactory.namedNode('a'), DataFactory.namedNode('b'), DataFactory.namedNode('http://dbpedia.org/resource/Ghent')));

// Create our engine, and query it.
// If you intend to query multiple times, be sure to cache your engine for optimal performance.
const myEngine = new QueryEngine();
const bindingsStream = await myEngine.queryBindings(`
  SELECT ?s ?p ?o WHERE {
    ?s ?p <http://dbpedia.org/resource/Belgium>.
    ?s ?p ?o
  } LIMIT 100`, {
  sources: [store],
});

// Consume results as a stream (best performance)
bindingsStream.on('data', (binding) => {
  console.log(binding.toString()); // Quick way to print bindings for testing

  console.log(binding.has('s')); // Will be true

  // Obtaining values
  console.log(binding.get('s').value);
  console.log(binding.get('s').termType);
  console.log(binding.get('p').value);
  console.log(binding.get('o').value);
});
bindingsStream.on('end', () => {
  // The data-listener will not be called anymore once we get here.
});
bindingsStream.on('error', (error) => {
  console.error(error);
});

// Consume results as an array (easier)
const bindings = await bindingsStream.toArray();
console.log(bindings[0].get('s').value);
console.log(bindings[0].get('s').termType);
```

_[**Read more** about querying in an application](https://comunica.dev/docs/query/getting_started/query_app/)._

## Update

```javascript
const QueryEngine = require('@comunica/query-sparql-rdfjs').QueryEngine;
const N3Store = require('n3').Store;

// This can be any RDFJS store
const store = new N3Store();

// Create our engine, and query it.
const myEngine = new QueryEngine();
const query = `
PREFIX dc: <http://purl.org/dc/elements/1.1/>
INSERT DATA
{ 
  <http://example/book1> dc:title "A new book" ;
                         dc:creator "A.N.Other" .
}
`;

// Execute the update
await myEngine.queryVoid(query, {
  sources: [store],
});

// Prints '2' => the store is updated
console.log(store.size);
```

_[**Read more** about updating in an application](https://comunica.dev/docs/query/getting_started/update_app/)._

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
