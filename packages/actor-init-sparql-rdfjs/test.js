const c = require('./index.js');
const N3Store = require('n3').Store;
const F = require('n3').DataFactory;

const store = new N3Store();
store.addQuad(F.quad(F.namedNode('a'), F.namedNode('a'), F.namedNode('a')));
const source = {
  match: function(s, p, o, g) {
    return require('streamify-array')(store.getQuads(s, p, o, g));
  }
};

c.newEngine().query('SELECT * { ?s ?p ?o } LIMIT 1',
  { sources: [ { type: 'rdfjsSource', value: source } ] }).then(function (result) {
  result.bindingsStream.on('error', console.error);
  result.bindingsStream.on('data', function (data) {
    console.log(data.toObject());
  });
});

/*c.newEngineDynamic().then((e) => {
  e.query('SELECT * { ?s ?p ?o } LIMIT 1',
  { sources: [ { type: 'file', value: 'http://fragments.dbpedia.org/2015/en' } ] }).then(function (result) {
    result.bindingsStream.on('data', function (data) {
      console.log(data.toObject());
    });
  });
}).catch(console.error);*/
