# Comunica SPARQL Init Actor

A comunica SPARQL Init Actor.

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