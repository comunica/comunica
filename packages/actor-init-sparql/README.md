# Comunica SPARQL Init Actor

A comunica SPARQL Init Actor.

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
const newEngine = require('../index.js').newEngine;

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
const newEngineDynamic = require('../index.js').newEngineDynamic;

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

This engine requires [Node.js](http://nodejs.org/) 8.0 or higher.

The easiest way to install the client is by installing it from NPM as follows:

```bash
$ [sudo] npm install -g @comunica/actor-init-sparql
```

Alternatively, you can install from the latest GitHub sources.
For this, please refer to the README of the [Comunica monorepo](https://github.com/comunica/comunica).
