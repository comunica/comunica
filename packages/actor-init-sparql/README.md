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
$ comunica-sparql http://dbpedia.org/resource/Belgium "CONSTRUCT WHERE { ?s ?p ?o }"
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
$ comunica-sparql-http "{ \"sources\": [\"http://fragments.dbpedia.org/2015/en\"]}"
```

or

```bash
$ comunica-sparql-http "{ \"sources\": [{ \"type\" : \"file\", \"value\" : \"https://ruben.verborgh.org/profile/\" }]}"
```

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
  { sources: ['http://fragments.dbpedia.org/2015/en'] })
result.bindingsStream.on('data', (data) => console.log(data.toObject()));
```

Optionally, specific types of sources can be specified (_otherwise, the type of source will be detected automatically_):

```javascript
const result = await myEngine.query('SELECT * WHERE { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
  { sources: [
    'http://fragments.dbpedia.org/2015/en',
    { type: 'sparql', value: 'https://dbpedia.org/sparql' },
    { type: 'file', value: 'https://ruben.verborgh.org/profile/' },
    { type: 'rdfjsSource', value: new N3Store() },
  ] })
result.bindingsStream.on('data', (data) => console.log(data.toObject()));
```

For `CONSTRUCT` and `DESCRIBE` queries,
results can be collected as follows.

```javascript
const result = await myEngine.query('CONSTRUCT { ?s ?p <http://dbpedia.org/resource/Belgium> } LIMIT 100',
  { sources: ['http://fragments.dbpedia.org/2015/en'] })
result.quadStream.on('data', (data) => console.log(data.toObject()));
```

Finally, `ASK` queries return async booleans.

```javascript
const result = await myEngine.query('ASK { ?s ?p <http://dbpedia.org/resource/Belgium> }',
  { sources: ['http://fragments.dbpedia.org/2015/en'] })
const isPresent = await result.booleanResult;
```

**Context options:**

| **Key** | **Description** |
| ------- | --------------- |
| `sources` | An array of data sources, e.g. `[ { value: 'http://fragments.dbpedia.org/2015/en' } ]`. Optionally, a source can have a `type` field to _force_ a specific type. For example, `[ { type: 'file', value: 'http://fragments.dbpedia.org/2015/en' } ]` will make sure the source is seen as a file with all hypermedia ignored. Source types can be forced as: `sparql`, `file`, `rdfjsSource` |
| `initialBindings` | Variables that have to be pre-bound to values in the query, using the `Bindings` datastructure, e.g. `Bindings({ '?s': literal('sl') })`. |
| `queryFormat` | Name of the provided query's format. Defaults to `sparql`, can also be `graphql` |
| `baseIRI` | Base IRI for relative IRIs in SPARQL queries, e.g. `http://example.org/`. |
| `log` | Logger to use, e.g. `new LoggerPretty({ level: 'warn' })`. |
| `datetime` | Datetime to handle time travel with [Memento](http://timetravel.mementoweb.org/), e.g. `new Date()`. |
| `lenient` | If failing requests and parsing errors should be logged instead of causing a hard crash. Defaults to `false`. |

#### *(Optional)* Result formatting

As mentioned before, query results are either a `bindingsStream` (for `SELECT` queries),
`quadStream` (for `CONSTRUCT` queries), or `booleanResult` (for `ASK` queries).

Using the `@comunica/actor-sparql-serialize-*` actors,
Comunica allows these results to be serialized into standard formats in a streaming manner.

For example, serializing results to the [SPARQL/JSON](https://www.w3.org/TR/sparql11-results-json/) format
can be done as follows:

```javascript
const result = await myEngine.query('SELECT * WHERE { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
  { sources: ['http://fragments.dbpedia.org/2015/en'] });
const { data } = await myEngine.resultToString(result, 'application/sparql-results+json');
data.pipe(process.stdout);
```

Passing a media type as second argument is optional.
If none is supplied, then `application/json` will be picked for bindings,
`application/trig` for quads, and `simple` for booleans.

By default, the following result formats are available:

| **Media type** | **Description** |
| ------- | --------------- |
| [`application/json`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-json) | A custom, simplified JSON result format. |
| [`simple`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-simple) | A custom, text-based result format. |
| [`application/sparql-results+json`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-sparql-json) | The [SPARQL/JSON](https://www.w3.org/TR/sparql11-results-json/) results format. |
| [`application/sparql-results+xml`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-sparql-xml) | The [SPARQL/XML](https://www.w3.org/TR/rdf-sparql-XMLres/) results format. |
| [`stats`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-stats) | A custom results format for testing and debugging. |
| [`table`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-table) | A text-based visual table result format. |
| [`tree`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-tree) | A tree-based result format for GraphQL-LD result compacting. |
| [`application/trig`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-rdf) | The [TriG](https://www.w3.org/TR/trig/) RDF serialization. |
| [`application/n-quads`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-rdf) | The [N-Quads](https://www.w3.org/TR/n-quads/) RDF serialization. |
| [`text/turtle`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-rdf) | The [Turtle](https://www.w3.org/TR/turtle/) RDF serialization. |
| [`application/n-triples`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-rdf) | The [N-Triples](https://www.w3.org/TR/n-triples/) RDF serialization. |
| [`text/n3`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-rdf) | The [Notation3](https://www.w3.org/TeamSubmission/n3/) serialization. |
| [`application/ld+json`](https://github.com/comunica/comunica/tree/master/packages/actor-sparql-serialize-rdf) | The [JSON-LD](https://json-ld.org/) RDF serialization. |

This list of available formats can also be retrieved dynamically by invoking the (asynchronous) `engine.getResultMediaTypes()` method.

On the command-line, the result format can be set using the `-t` flag:

```bash
$ comunica-sparql http://dbpedia.org/resource/Belgium "SELECT * WHERE { ?s ?p ?o }" -t 'application/sparql-results+json'
```

All available result formats can be listed from the command-line using `--listformats`:

```bash
$ comunica-sparql --listformats
```

#### *(Optional)* Cache handling

When remote documents are fetched over HTTP, a Comunica engine can cache documents to optimize future reuse.
If your application works over volatile resources, then you may want to invalidate this cache,
which can be done as follows:

```javascript
myEngine.invalidateHttpCache(); // Invalidate the full cache
myEngine.invalidateHttpCache('http://example.org/page.html'); // Invalidate a single document
```

#### *(Optional)* GraphQL-LD

Instead of SPARQL queries, you can also define [GraphQL](https://graphql.org/) queries
(with a [JSON-LD](https://json-ld.org/) context).

If you want to convert your results to a GraphQL tree,
then you will need the `@comunica/actor-sparql-serialize-tree` dependency,
otherwise you can consume the bindings stream manually.

```javascript
const newEngine = require('@comunica/actor-init-sparql').newEngine;
const bindingsStreamToGraphQl = require('@comunica/actor-sparql-serialize-tree').bindingsStreamToGraphQl;

const myEngine = newEngine();
const config = {
  sources: ['http://fragments.dbpedia.org/2016-04/en'],
  queryFormat: 'graphql',
  "@context": {
    "label": { "@id": "http://www.w3.org/2000/01/rdf-schema#label", "@singular": true },
    "label_en": { "@id": "http://www.w3.org/2000/01/rdf-schema#label", "@language": "en" },
    "writer": { "@id": "http://dbpedia.org/ontology/writer", "@singular": true },
    "artist": { "@id": "http://dbpedia.org/ontology/musicalArtist", "@singular": true },
    "artist_label": { "@singular": true }
  }
};
myEngine.query('{ label writer(label_en: \"Michael Jackson\") artist { label } }', config)
  .then(function (result) { return bindingsStreamToGraphQl(result.bindingsStream, config); })
  .then(console.log);
```

To run GraphQL queries from the command line, set the `-i` flag to `graphql` and refer to your config file with the JSON-LD context (`@context`) through the `-c` flag. To output your results as a GraphQL tree, set the MIME type of the output with `-t` to `tree`. For example:

```bash
$ comunica-sparql http://fragments.dbpedia.org/2015-10/en -q "{ label @single }" -c config-with-context.json -i graphql -t tree
```

#### *(Optional)* Logging

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

#### *(Optional)* Proxy

Optionally, you can configure a proxy to redirect all HTTP(S) traffic.
This is for example useful when Comunica is used in a Web browser where a [proxy enables CORS headers on all responses](https://www.npmjs.com/package/cors-anywhere).

Via the command line, a proxy can be enabled as follows:
```bash
$ comunica-sparql http://fragments.dbpedia.org/2015-10/en "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100" -p http://myproxy.org/?uri=
```

This will cause all requests to be modified by appending the original URL to the proxy URL `http://myproxy.org/?uri=http://fragments.dbpedia.org/2015-10/en`.

A proxy can also be configured via the programmatic API as follows:
```javascript
const ProxyHandlerStatic = require("@comunica/actor-http-proxy").ProxyHandlerStatic;

const result = await myEngine.query('SELECT * WHERE { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
  {
    sources: [ { type: 'hypermedia', value: 'http://fragments.dbpedia.org/2015/en' } ],
    httpProxyHandler: new ProxyHandlerStatic('http://myproxy.org/?uri='),
  });
```

Next to `ProxyHandlerStatic`, more advanced proxy handlers can be created by implementing [`IProxyHandler`](https://github.com/comunica/comunica/blob/master/packages/actor-http-proxy/lib/IProxyHandler.ts).

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
  { sources: ['http://fragments.dbpedia.org/2015/en'] })
  .then(function (result) {
    result.bindingsStream.on('data', function (data) {
      console.log(data.toObject());
    });
  });
```

The browser script is pre-compiled using a config file and can therefore only be invoked dynamically.
See the `prepare` and `browser` scripts in `package.json` to compile using a custom config file.

_If you want to use GraphQL-LD here as well, you can do this similar as in the Node.JS API using `Comunica.bindingsStreamToGraphQl`_
