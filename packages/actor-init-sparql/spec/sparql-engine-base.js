const ProxyHandlerStatic = require('@comunica/actor-http-proxy').ProxyHandlerStatic;
const RdfTestSuite = require('rdf-test-suite');
const N3Store = require('n3').Store;

module.exports = function(engine) {
  return {
    parse: function (query, options) {
      return engine.mediatorSparqlParse.mediate({ query: query, baseIRI: options.baseIRI });
    },
    query: function(data, queryString, options) {
      return this.queryLdf([{ type: 'rdfjsSource', value: source(data) }], null, queryString, options);
    },
    queryLdf: async function(sources, proxyUrl, queryString, options) {
      const result = await engine.query(queryString, {
        baseIRI: options.baseIRI,
        sources,
        httpProxyHandler: proxyUrl ? new ProxyHandlerStatic(proxyUrl) : null,
      });
      if (result.type === 'boolean') {
        return new RdfTestSuite.QueryResultBoolean(await result.booleanResult);
      }
      if (result.type === 'quads') {
        return new RdfTestSuite.QueryResultQuads(await require('arrayify-stream')(result.quadStream));
      }
      if (result.type === 'bindings') {
        return new RdfTestSuite.QueryResultBindings(result.variables, await require('arrayify-stream')(result.bindingsStream.map((binding) => binding.toObject())));
      }
    }
  };
};

function source(data) {
  const store = new N3Store();
  store.addQuads(data);
  return {
    match: function(s, p, o, g) {
      return require('streamify-array')(store.getQuads(s, p, o, g));
    }
  };
}
