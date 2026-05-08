const ProxyHandlerStatic = require('@comunica/actor-http-proxy').ProxyHandlerStatic;
const { KeysInitQuery } = require('@comunica/context-entries');
const { ActionContext } = require('@comunica/core');
const RdfStore = require('rdf-stores').RdfStore;
const RdfTestSuite = require('rdf-test-suite');

// Patch TestCaseQueryEvaluation to pass dataset named graph URIs to the engine.
// The rdf-test-suite handler API only passes quads, which loses information about
// empty named graphs (graphs defined via qt:graphData but containing no triples).
const TestCaseQueryEvaluation = RdfTestSuite.TestCaseQueryEvaluation;
const origTest = TestCaseQueryEvaluation.prototype.test;
TestCaseQueryEvaluation.prototype.test = function(engine, injectArguments) {
  const namedGraphs = this.queryDataLinks
    .filter(link => link.dataGraph)
    .map(link => link.dataGraph);
  return origTest.call(this, engine, { ...injectArguments, datasetNamedGraphs: namedGraphs });
};

module.exports = function(engine) {
  return {
    parse(query, options) {
      return engine.actorInitQuery.mediatorQueryProcess.bus.actors[0].parse(query, new ActionContext({ [KeysInitQuery.baseIRI.name]: options.baseIRI }));
    },
    query(data, queryString, options) {
      return this.queryLdf([{ type: 'rdfjs', value: source(data) }], null, queryString, options);
    },
    async queryLdf(sources, proxyUrl, queryString, options) {
      sources = sources.map((source) => {
        if (source.type === 'rdfjsSource') {
          source.type = 'rdfjs';
        }
        return source;
      });
      const result = await engine.query(queryString, {
        baseIRI: options.baseIRI,
        sources,
        httpProxyHandler: proxyUrl ? new ProxyHandlerStatic(proxyUrl) : null,
        httpRetryCount: 3,
        httpRetryDelayFallback: 10,
        httpRetryDelayLimit: 100,
        datasetNamedGraphs: options.datasetNamedGraphs,
      });
      if (result.resultType === 'boolean') {
        return new RdfTestSuite.QueryResultBoolean(await result.execute());
      }
      if (result.resultType === 'quads') {
        return new RdfTestSuite.QueryResultQuads(await require('arrayify-stream').default(await result.execute()));
      }
      if (result.resultType === 'bindings') {
        return new RdfTestSuite.QueryResultBindings(
          (await result.metadata()).variables.map(variable => `?${variable.value}`),
          (await require('arrayify-stream').default(await result.execute()))
            .map(binding => Object.fromEntries([ ...binding ]
              .map(([ key, value ]) => [ `?${key.value}`, value ]))),
        );
      }
      throw new Error(`Invalid query result type: ${result.resultType}`);
    },
    async update(data, queryString, options) {
      const store = await source(data);
      const result = await engine.query(queryString, {
        baseIRI: options.baseIRI,
        sources: [{ type: 'rdfjs', value: store }],
        destination: store,
      });
      await result.execute();
      return store.getQuads();
    },
  };
};

function source(data) {
  const store = RdfStore.createDefault(true);
  for (quad of data) {
    store.addQuad(quad);
  }
  return store;
}
