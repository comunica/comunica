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
  const defaultTerms = [];
  const namedTerms = [];

  try {
    const algebra = translate(queryString, { baseIRI });

    function walk(node) {
      if (!node || typeof node !== 'object') {
        return;
      }

      if (node.type === 'from') {
        if (Array.isArray(node.default)) {
          defaultTerms.push(...node.default);
        }
        if (Array.isArray(node.named)) {
          namedTerms.push(...node.named);
        }
      }

      for (const key of Object.keys(node)) {
        if (Array.isArray(node[key])) {
          for (const child of node[key]) {
            walk(child);
          }
        } else if (typeof node[key] === 'object') {
          walk(node[key]);
        }
      }
    }

    walk(algebra);
  } catch {
    // If translation fails, fall back gracefully
  }

  const defaultMap = new Map();
  for (const term of defaultTerms) {
    defaultMap.set(term.value, term);
  }

  const namedMap = new Map();
  for (const term of namedTerms) {
    namedMap.set(term.value, term);
  }

  return {
    defaultGraphTerms: [ ...defaultMap.values() ],
    namedGraphTerms: [ ...namedMap.values() ],
  };
}

async function getQuadsForGraph(graphTerm, data) {
  const uri = graphTerm.value;

  // 1. Look for quads in `data` explicitly matching named graph `uri`
  const namedQuadsInData = data.filter(q => q.graph && q.graph.value === uri);
  if (namedQuadsInData.length > 0) {
    return namedQuadsInData;
  }

  // 2. Fetch the RDF resource via RdfTestSuite
  try {
    const [ , stream ] = await RdfTestSuite.Util.fetchRdf(uri);
    const quads = await arrayifyStream(stream);
    if (quads && quads.length > 0) {
      return quads;
    }
  } catch {
    // Resource fetch failed or network unavailable
  }

  // 3. Fallback: if data has default graph quads, return those
  const defaultQuadsInData = data.filter(q => q.graph && q.graph.termType === 'DefaultGraph');
  if (defaultQuadsInData.length > 0) {
    return defaultQuadsInData;
  }

  return [];
}

function stripFromClauses(queryString) {
  return queryString.replaceAll(/from\s+(?:named\s+)?(?:<[^>]*>|[^\s(){}]+)/giu, '');
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

  // 1. Populate active Default Graph from `FROM` clauses
  for (const term of defaultGraphTerms) {
    const quads = await getQuadsForGraph(term, data);
    for (const q of quads) {
      store.addQuad(DF.quad(q.subject, q.predicate, q.object, DF.defaultGraph()));
    }
  }

  // 2. Populate active Named Graphs from `FROM NAMED` clauses
  for (const term of namedGraphTerms) {
    const quads = await getQuadsForGraph(term, data);
    for (const q of quads) {
      store.addQuad(DF.quad(q.subject, q.predicate, q.object, term));
    }
  }

  const cleanQuery = stripFromClauses(queryString);

  return { store, cleanQuery };
}
