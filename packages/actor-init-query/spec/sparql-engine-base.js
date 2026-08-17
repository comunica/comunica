const ProxyHandlerStatic = require('@comunica/actor-http-proxy').ProxyHandlerStatic;
const { KeysInitQuery } = require('@comunica/context-entries');
const { ActionContext } = require('@comunica/core');
const arrayifyStream = require('arrayify-stream').default;
const { DataFactory } = require('rdf-data-factory');
const RdfStore = require('rdf-stores').RdfStore;
const RdfTestSuite = require('rdf-test-suite');
const { translate } = require('sparqlalgebrajs');

const DF = new DataFactory();

module.exports = function(engine) {
  return {
    parse(query, options) {
      return engine.actorInitQuery.mediatorQueryProcess.bus.actors[0].parse(query, new ActionContext({ [KeysInitQuery.baseIRI.name]: options.baseIRI }));
    },
    async query(data, queryString, options) {
      const { store, cleanQuery } = await prepareDatasetAndQuery(data, queryString, options.baseIRI);
      return this.queryLdf([{ type: 'rdfjs', value: store }], null, cleanQuery, options);
    },
    async queryResultFormat(data, queryString, mediaType, options) {
      const { store, cleanQuery } = await prepareDatasetAndQuery(data, queryString, options.baseIRI);
      const result = await engine.query(cleanQuery, {
        baseIRI: options.baseIRI,
        sources: [{ type: 'rdfjs', value: store }],
      });
      return (await engine.resultToString(result, mediaType)).data;
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
      const store = RdfStore.createDefault(true);
      for (const quad of data) {
        store.addQuad(quad);
      }
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

function collectDatasetClauses(queryString, baseIRI) {
  // Maps are used for deduplication by term.value
  const defaultMap = new Map();
  const namedMap = new Map();

  const algebra = translate(queryString, { baseIRI });

  function walk(node) {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type === 'from') {
      if (Array.isArray(node.default)) {
        for (const term of node.default) {
          defaultMap.set(term.value, term);
        }
      }
      if (Array.isArray(node.named)) {
        for (const term of node.named) {
          namedMap.set(term.value, term);
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (Array.isArray(node[key])) {
        for (const child of node[key]) {
          walk(child);
        }
      } else {
        walk(node[key]);
      }
    }
  }

  walk(algebra);

  return {
    defaultGraphTerms: [ ...defaultMap.values() ],
    namedGraphTerms: [ ...namedMap.values() ],
  };
}

async function getQuadsForGraph(uri) {
  const [ , stream ] = await RdfTestSuite.Util.fetchRdf(uri);
  return await arrayifyStream(stream);
}

async function prepareDatasetAndQuery(data, queryString, baseIRI) {
  const { defaultGraphTerms, namedGraphTerms } = collectDatasetClauses(queryString, baseIRI);
  const hasDatasetClauses = defaultGraphTerms.length > 0 || namedGraphTerms.length > 0;

  const store = RdfStore.createDefault(true);

  if (!hasDatasetClauses) {
    for (const quad of data) {
      store.addQuad(quad);
    }
    return { store, cleanQuery: queryString };
  }

  for (const term of defaultGraphTerms) {
    const quads = await getQuadsForGraph(term.value);
    for (const q of quads) {
      store.addQuad(DF.quad(q.subject, q.predicate, q.object, DF.defaultGraph()));
    }
  }

  for (const term of namedGraphTerms) {
    const quads = await getQuadsForGraph(term.value);
    for (const q of quads) {
      store.addQuad(DF.quad(q.subject, q.predicate, q.object, term));
    }
  }

  // Strip FROM clauses
  const cleanQuery = queryString.replaceAll(/from\s+(?:named\s+)?(?:<[^>]*>|[^\s(){}]+)/giu, '');

  return { store, cleanQuery };
}
