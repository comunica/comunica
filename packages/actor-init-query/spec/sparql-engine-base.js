const ProxyHandlerStatic = require('@comunica/actor-http-proxy').ProxyHandlerStatic;
const { KeysInitQuery } = require('@comunica/context-entries');
const { ActionContext } = require('@comunica/core');
const { stringify: stringifyStream } = require('@jeswr/stream-to-string');
const RdfStore = require('rdf-stores').RdfStore;
const RdfTestSuite = require('rdf-test-suite');

module.exports = function(engine) {
  return {
    parse(query, options) {
      return engine.actorInitQuery.mediatorQueryProcess.bus.actors[0].parse(query, new ActionContext({ [KeysInitQuery.baseIRI.name]: options.baseIRI }));
    },
    query(data, queryString, options) {
      return this.queryLdf([{ type: 'rdfjs', value: source(data) }], null, queryString, options);
    },
    async queryResultFormat(data, queryString, mediaType, options) {
      const result = await engine.query(queryString, {
        baseIRI: options.baseIRI,
        sources: [{ type: 'rdfjs', value: source(data) }],
      });
      return (await engine.resultToString(result, mediaType)).data;
    },
    /**
     * @param sources - The LDF sources to query.
     * @param proxyUrl - The proxy URL to use.
     * @param queryString - The query to execute.
     * @param options - Query options. Must include the `checkOrder` property.
     */
    async queryLdf(sources, proxyUrl, queryString, options) {
      sources = sources.map((source) => {
        if (source.type === 'rdfjsSource') {
          source.type = 'rdfjs';
        }
        return source;
      });
      const serviceFetch = createServiceFetch(engine, options.serviceData);
      const result = await engine.query(queryString, {
        baseIRI: options.baseIRI,
        sources,
        ...(serviceFetch && { fetch: serviceFetch }),
        httpProxyHandler: proxyUrl ? new ProxyHandlerStatic(proxyUrl) : null,
        httpRetryCount: 3,
        httpRetryDelayFallback: 10,
        httpRetryDelayLimit: 100,
        nonLexicalComparison: options.nonLexicalComparison,
        fullTermComparison: options.fullTermComparison,
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
          options.checkOrder,
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

function createServiceFetch(engine, serviceData) {
  if (!serviceData) {
    return;
  }

  const stores = Object.fromEntries(Object.entries(serviceData)
    .map(([ endpoint, data ]) => [ endpoint, source(data) ]));

  async function serviceFetch(input, init) {
    const url = new URL(input);
    const store = stores[`${url.origin}${url.pathname}`];
    const query = extractQuery(url, init);
    if (!store || !query) {
      return new Response(null, { status: 404 });
    }

    const result = await engine.query(query, { sources: [ store ]});
    const mediaType = 'application/sparql-results+json';
    const body = await stringifyStream((await engine.resultToString(result, mediaType)).data);
    return new Response(body, { status: 200, headers: { 'content-type': mediaType }});
  }

  return serviceFetch;
}

function extractQuery(url, init) {
  return url.searchParams.get('query') ??
    (init.body ? new URLSearchParams(String(init.body)).get('query') : null);
}
