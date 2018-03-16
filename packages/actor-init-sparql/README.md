# Comunica SPARQL

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

## Execute SPARQL queries

This actor can be used to execute SPARQL queries from
the command line, HTTP (SPARQL protocol), within a Node.JS application, or from a browser.

### Usage from the command line

Show 100 triples from http://fragments.dbpedia.org/2015-10/en:

```bash
$ comunica-sparql http://fragments.dbpedia.org/2015-10/en "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Show the help with all options:

```bash
$ comunica-sparql --help
```

The dynamic variant of this executable is `comunica-dynamic-sparql`.
An alternative config file can be passed via the `COMUNICA_CONFIG` environment variable.

### Usage from HTTP

Start a webservice exposing http://fragments.dbpedia.org/2015-10/en via the SPARQL protocol.

```bash
$ comunica-sparql-http "{ \"sources\": [{ \"type\": \"entrypoint\", \"value\" : \"http://fragments.dbpedia.org/2015/en\" }]}""
```

Show the help with all options:

```bash
$ comunica-sparql-http --help
```

The HTTP service can only be started dynamically.
An alternative config file can be passed via the `COMUNICA_CONFIG` environment variable.

### Usage within application

_Static:_

```javascript
const newEngine = require('@comunica/actor-init-sparql').newEngine;

const myEngine = newEngine();
myEngine.query('SELECT * { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
  { sources: [ { type: 'hypermedia', value: 'http://fragments.dbpedia.org/2015/en' } ] })
  .then(function (result) {
    result.bindingsStream.on('data', function (data) {
      console.log(data.toObject());
    });
  });
```

_Dynamic:_

```javascript
const newEngineDynamic = require('@comunica/actor-init-sparql').newEngineDynamic;

newEngineDynamic().then(function (myEngine) {
  myEngine.query('SELECT * { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
    { sources: [ { type: 'hypermedia', value: 'http://fragments.dbpedia.org/2015/en' } ] })
    .then(function (result) {
      result.bindingsStream.on('data', function (data) {
        console.log(data.toObject());
      });
    });
});
```

### Usage within browser

This engine can run in the browser using [Webpack](https://www.npmjs.com/package/webpack).
To created a web-packed version of the engine, run `yarn browser` to create `dist/comunica-browser.js`.

Include this file in your webpage as follows:

```html
<script src="path/to/comunica-browser.js"></script>
```

After that, `Comunica.evaluateQuery` can be called via JavaScript. 

```javascript
Comunica.evaluateQuery('SELECT * { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
  { entrypoint: 'http://fragments.dbpedia.org/2015/en' })
  .then(function (result) {
    result.bindingsStream.on('data', function (data) {
      console.log(data.toObject());
    });
  });
```

The browser script is pre-compiled using a config file and can therefore only be invoked dynamically.
See the `prepare` and `browser` scripts in `package.json` to compile using a custom config file.

## Installation

Comunica requires [Node.JS](http://nodejs.org/) 8.0 or higher and is tested on OSX and Linux.

The easiest way to install the client is by installing it from NPM as follows:

```bash
$ [sudo] npm install -g @comunica/actor-init-sparql
```

Alternatively, you can install from the latest GitHub sources.
For this, please refer to the README of the [Comunica monorepo](https://github.com/comunica/comunica).
