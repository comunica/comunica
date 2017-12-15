# Comunica SPARQL Init Actor

A comunica SPARQL Init Actor.

## Usage within application

```javascript
const query = require('@comunica/actor-init-sparql').query;

query('SELECT * { ?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o } LIMIT 100',
  { entrypoint: 'http://fragments.dbpedia.org/2015/en' })
  .then(function (result) {
    result.bindingsStream.on('data', function (data) {
      console.log(data.toObject());
    });
  });
```
