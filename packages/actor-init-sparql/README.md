# Comunica SPARQL

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-sparql.svg)](https://www.npmjs.com/package/@comunica/actor-init-sparql)
[![Docker Pulls](https://img.shields.io/docker/pulls/comunica/actor-init-sparql.svg)](https://hub.docker.com/r/comunica/actor-init-sparql/)

Linked Data on the Web is being published in different ways,
such as [data dumps](http://downloads.dbpedia.org/3.9/en/),
[subject pages](http://dbpedia.org/page/Linked_data),
[results of SPARQL queries](http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=CONSTRUCT+%7B+%3Fp+a+dbpedia-owl%3AArtist+%7D%0D%0AWHERE+%7B+%3Fp+a+dbpedia-owl%3AArtist+%7D&format=text%2Fturtle),
and [Triple Pattern Fragments](http://data.linkeddatafragments.org/dbpedia2014?subject=&predicate=rdf%3Atype&object=dbpedia-owl%3ARestaurant).
This client is able to solve queries over such _heterogeneous interfaces_.

Concretely, Comunica SPARQL is a module that is preconfigured with a configuration file to initialize
the [Comunica engine](https://github.com/comunica/comunica) with actors to evaluate SPARQL queries
over heterogeneous interfaces.

It's main distinguishing features are the following:

* High modularity enabling easy extensions and customization.
* Federated querying over heterogeneous interfaces.
* Can run using [Node.JS](http://nodejs.org/), in the browser, and via the command-line.

Comunica can either be invoked **dynamically** using a configuration file,
or **statically** using a pre-compiled configuration file.
The latter will be faster to start because the dependency-injection phase can be avoided.

**This actor can not query over local files for security reasons, but [Comunica SPARQL file](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql-file#readme) can.**

## Installation

Comunica requires [Node.JS](http://nodejs.org/) 8.0 or higher and is tested on OSX and Linux.

The easiest way to install the client is by installing it from NPM as follows:

```bash
$ [sudo] npm install -g @comunica/actor-init-sparql
```

Alternatively, you can install from the latest GitHub sources.
For this, please refer to the README of the [Comunica monorepo](https://github.com/comunica/comunica).

## Execute SPARQL queries

This actor can be used to execute SPARQL queries from
the command line, HTTP (SPARQL protocol), within a Node.JS application, or from a browser.

### Usage from the command line

Show 100 triples from http://fragments.dbpedia.org/2015-10/en:

```bash
$ comunica-sparql http://fragments.dbpedia.org/2015-10/en "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Show all triples from http://dbpedia.org/resource/Belgium:

```bash
$ comunica-sparql file@http://dbpedia.org/resource/Belgium "CONSTRUCT WHERE { ?s ?p ?o }"
```

Combine multiple sources:

```bash
$ comunica-sparql http://fragments.dbpedia.org/2015-10/en file@http://dbpedia.org/resource/Belgium "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Show the help with all options:

```bash
$ comunica-sparql --help
```

The dynamic variant of this executable is `comunica-dynamic-sparql`.
An alternative config file can be passed via the `COMUNICA_CONFIG` environment variable.

When you are working with this module in the Comunica monorepo development environment,
this command can be invoked directly as follows (when inside the `packages/actor-init-sparql` folder):

```bash
node bin/query.js http://fragments.dbpedia.org/2016-04/en "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Use `bin/query-dynamic.js` when running dynamically inside the Comunica monorepo development environment.

### Usage as a SPARQL endpoint

Start a webservice exposing http://fragments.dbpedia.org/2015-10/en via the SPARQL protocol, i.e., a _SPARQL endpoint_.

```bash
$ comunica-sparql-http "{ \"sources\": [{ \"type\": \"hypermedia\", \"value\" : \"http://fragments.dbpedia.org/2015/en\" }]}"
```

_(Use `\"type\": \"file\"` if you want to query over remote RDF files)_

Show the help with all options:

```bash
$ comunica-sparql-http --help
```

The SPARQL endpoint can only be started dynamically.
An alternative config file can be passed via the `COMUNICA_CONFIG` environment variable.

Use `bin/http.js` when running in the Comunica monorepo development environment.

### Usage within application

The easiest way to create an engine (with default config) is as follows:

```javascript
const newEngine = require('@comunica/actor-init-sparql').newEngine;

const myEngine = newEngine();
```

Alternatively, an engine can also be created dynamically with a custom config:

```javascript
const newEngineDynamic = require('@comunica/actor-init-sparql').newEngineDynamic;

const myEngine = await newEngineDynamic({ configResourceUrl: 'path/to/config.json' });
```

Once you have created your query engine,
you can use it to call the async `query(queryString, context)` method,
which returns an output of type that depends on the given query string.

For example, a `SELECT` query can be executed as follows:

```javascript
const result = await myEngine.query('SELECT * WHERE { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
  { sources: [ { type: 'hypermedia', value: 'http://fragments.dbpedia.org/2015/en' } ] })
result.bindingsStream.on('data', (data) => console.log(data.toObject()));
```

For `CONSTRUCT` and `DESCRIBE` queries,
results can be collected as follows.

```javascript
const result = await myEngine.query('CONSTRUCT { ?s ?p <http://dbpedia.org/resource/Belgium> } LIMIT 100',
  { sources: [ { type: 'hypermedia', value: 'http://fragments.dbpedia.org/2015/en' } ] })
result.quadStream.on('data', (data) => console.log(data.toObject()));
```

Finally, `ASK` queries return async booleans.

```javascript
const result = await myEngine.query('ASK { ?s ?p <http://dbpedia.org/resource/Belgium> }',
  { sources: [ { type: 'hypermedia', value: 'http://fragments.dbpedia.org/2015/en' } ] })
const isPresent = await result.booleanResult;
```

**Context options:**

| **Key** | **Description** |
| ------- | --------------- |
| `sources` | An array of data sources, e.g. `[ { type: 'hypermedia', value: 'http://fragments.dbpedia.org/2015/en' } ]`. Sources can be one of the following types: `hypermedia`, `sparql`, `file` |
| `initialBindings` | Variables that have to be pre-bound to values in the query, using the `Bindings` datastructure, e.g. `Bindings({ '?s': literal('sl') })`. |
| `queryFormat` | Name of the provided query's format. Defaults to `sparql`, can also be `graphql` |
| `baseIRI` | Base IRI for relative IRIs in SPARQL queries, e.g. `http://example.org/`. |
| `log` | Logger to use, e.g. `new LoggerPretty({ level: 'warn' })`. |
| `datetime` | Datetime to handle time travel with [Memento](http://timetravel.mementoweb.org/), e.g. `new Date()`. |

_GraphQL-LD_

Instead of SPARQL queries, you can also define [GraphQL](https://graphql.org/) queries
(with a [JSON-LD](https://json-ld.org/) context).

If you want to convert your results to a GraphQL tree,
then you will need the `@comunica/actor-sparql-serialize-tree` dependency,
otherwise you can consume the bindings stream manually.

```javascript
const newEngine = require('@comunica/actor-init-sparql').newEngine;
const bindingsStreamToGraphQl = require('@comunica/actor-sparql-serialize-tree').bindingsStreamToGraphQl;

const myEngine = newEngine();
const context = {
  sources: [ { type: 'hypermedia', value: 'http://fragments.dbpedia.org/2016-04/en' } ],
  queryFormat: 'graphql',
  "@context": {
    "label": { "@id": "http://www.w3.org/2000/01/rdf-schema#label", "@singular": true },
    "label_en": { "@id": "http://www.w3.org/2000/01/rdf-schema#label", "@language": "en" },
    "writer": { "@id": "http://dbpedia.org/ontology/writer", "@singular": true },
    "artist": { "@id": "http://dbpedia.org/ontology/musicalArtist", "@singular": true },
    "artist_label": { "@singular": true }
  }
};
myEngine.query('{ label writer(label_en: \"Michael Jackson\") artist { label } }',context)
  .then(function (result) { return bindingsStreamToGraphQl(result.bindingsStream, context); })
  .then(console.log);
```

_Logging_

Optionally, a custom logger can be used inside Comunica.
By default, [`@comunica/logger-void`](https://github.com/comunica/comunica/tree/master/packages/logger-void/) is used,
which will simply void all log calls.
(_This default can be changed in the [configuration file](https://github.com/comunica/comunica/blob/master/packages/actor-init-sparql/config/config-default.json)_)

Alternatively, [`@comunica/logger-pretty`](https://github.com/comunica/comunica/tree/master/packages/logger-pretty/),
[`@comunica/logger-bunyan`](https://github.com/comunica/comunica/tree/master/packages/logger-bunyan/),
or a custom logger implementing the [`Logger`](https://github.com/comunica/comunica/blob/master/packages/core/lib/Logger.ts) interface can be used.

These loggers can be configured through the context as follows:
```javascript
import {LoggerPretty} from "@comunica/logger-pretty";

const context = {
  log: new LoggerPretty({ level: 'warn' });
};
myEngine.query('...', context);
```

### Usage within browser

_(Just want to quickly demo queries in the browser? Have a look at our [Web client](https://github.com/comunica/jQuery-Widget.js))_

This engine can run in the browser using [Webpack](https://www.npmjs.com/package/webpack).
To create a web-packed version of the engine, run `yarn run browser` (when inside the `packages/actor-init-sparql` folder) to create `comunica-browser.js`.
Alternatively, just [use a pre-built version from our CDN](https://github.com/rdfjs/comunica-browser).

Include this file in your webpage as follows:

```html
<script src="path/to/comunica-browser.js"></script>
```

After that, `Comunica.newEngine` can be called via JavaScript.

```javascript
const myEngine = Comunica.newEngine();
myEngine.query('SELECT * { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
  { sources: [ { type: 'hypermedia', value: 'http://fragments.dbpedia.org/2015/en' } ] })
  .then(function (result) {
    result.bindingsStream.on('data', function (data) {
      console.log(data.toObject());
    });
  });
```

The browser script is pre-compiled using a config file and can therefore only be invoked dynamically.
See the `prepare` and `browser` scripts in `package.json` to compile using a custom config file.

_If you want to use GraphQL-LD here as well, you can do this similar as in the Node.JS API using `Comunica.bindingsStreamToGraphQl`_
