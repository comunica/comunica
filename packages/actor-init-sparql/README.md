# Comunica SPARQL Init Actor

A comunica SPARQL Init Actor.

## Usage from the command line

Show 100 triples from http://fragments.dbpedia.org/2015-10/en:

```bash
$ comunica-sparql http://fragments.dbpedia.org/2015-10/en "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Show the help with all options:

```bash
$ comunica-sparql --help
```

## Usage from HTTP

Start a webservice exposing http://fragments.dbpedia.org/2015-10/en via the SPARQL protocol.

```bash
$ comunica-sparql-http "{ \"sources\": [{ \"type\": \"entrypoint\", \"value\" : \"http://fragments.dbpedia.org/2015/en\" }]}""
```

Show the help with all options:

```bash
$ comunica-sparql-http --help
```


## Usage within application

```javascript
const newEngine = require('../index.js').newEngine;

newEngine().then(function (myEngine) {
  myEngine.query('SELECT * { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
    { entrypoint: 'http://fragments.dbpedia.org/2015/en' })
    .then(function (result) {
      result.bindingsStream.on('data', function (data) {
        console.log(data.toObject());
      });
    });
});
```

## Usage within browser

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