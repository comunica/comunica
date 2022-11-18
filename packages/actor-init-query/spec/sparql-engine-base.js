const ProxyHandlerStatic = require('@comunica/actor-http-proxy').ProxyHandlerStatic;
const RdfTestSuite = require('rdf-test-suite');
const N3Store = require('n3').Store;

module.exports = function(engine) {
  return {
    parse: function (query, options) {
      return engine.actorInitQuery.mediatorQueryParse.mediate({ query: query, baseIRI: options.baseIRI });
    },
    query: function(data, queryString, options) {
      return this.queryLdf([{ type: 'rdfjsSource', value: source(data) }], null, queryString, options);
    },
    queryLdf: async function(sources, proxyUrl, queryString, options) {
      const result = await engine.query(queryString, {
        baseIRI: options.baseIRI,
        sources,
        httpProxyHandler: proxyUrl ? new ProxyHandlerStatic(proxyUrl) : null,
        httpRetryOnServerError: true,
        httpRetryCount: 3,
        httpRetryDelay: 10,
      });
      if (result.resultType === 'boolean') {
        return new RdfTestSuite.QueryResultBoolean(await result.execute());
      } else if (result.resultType === 'quads') {
        return new RdfTestSuite.QueryResultQuads(await require('arrayify-stream').default(await result.execute()));
      } else if (result.resultType === 'bindings') {
        return new RdfTestSuite.QueryResultBindings(
            (await result.metadata()).variables.map(variable => `?${variable.value}`),
            (await require('arrayify-stream').default(await result.execute()))
              .map((binding) => Object.fromEntries([ ...binding ]
                  .map(([ key, value ]) => [ `?${key.value}`, value ]))),
        );
      } else {
        throw new Error('Invalid query result type: ' + result.resultType);
      }
    },
    update: async function(data, queryString, options) {
      const store = await source(data);
      const result = await engine.query(queryString, {
        baseIRI: options.baseIRI,
        source: { type: 'rdfjsSource', value: store },
        destination: store,
      });
      await result.execute();
      return store.getQuads();
    },
  };
};

function source(data) {
  const store = new N3Store();
  store.addQuads(data);
  return store;
}
