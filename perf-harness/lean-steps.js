// Interleaved medians of the steps of a query on the lean path, as executed by the SPARQL endpoint.
// Usage: node perf-harness/lean-steps.js <engine-dir> <dataset> <reps> <query-file>...
// Env: FLAGS='{"x":true}' sets globalThis.__proto for prototype toggles.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const [ engineDir, dataset, repsArg, ...files ] = process.argv.slice(2);
globalThis.__proto = JSON.parse(process.env.FLAGS ?? '{}');
const { QueryEngine } = require(path.resolve(engineDir));
const { ActionContext } = require(path.resolve(__dirname, '../packages/core'));
const { KeysInitQuery } = require(path.resolve(__dirname, '../packages/context-entries'));
const { HttpServiceSparqlEndpoint } = require(path.resolve(__dirname, '../packages/actor-init-query/lib/HttpServiceSparqlEndpoint.js'));
const { LeanEvaluator } = require(path.resolve(__dirname, '../packages/actor-query-process-sequential/lib/LeanEvaluator.js'));

const engine = new QueryEngine();
const baseContext = { sources: [ path.resolve(dataset) ], [KeysInitQuery.baseIRI.name]: 'http://localhost:3002/sparql' };
// Same context entries as the endpoint with -l info
if (process.env.ENDPOINT_CONTEXT) {
  const { LoggerPretty } = require(path.resolve(__dirname, '../packages/logger-pretty'));
  baseContext.log = new LoggerPretty({ level: 'info' });
  baseContext.readOnly = true;
}
const queries = files.flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean)
  .map((query, i) => ({ name: `${path.basename(f, '.sparql')}#${i}`, query })));
const init = engine.actorInitQuery;
const sequential = init.mediatorQueryProcess.bus.actors.find(a => a.parse && a.optimize);
const identifier = sequential.mediatorOptimizeQueryOperation.bus.actors
  .find(actor => actor.name.endsWith('#query-source-identify'));
const evaluator = new LeanEvaluator();

const steps = {
  async full(query) {
    const result = await engine.query(query, { ...baseContext });
    return HttpServiceSparqlEndpoint.serializeRawRows(result[Symbol.for('comunica.prototype.rawRows')]);
  },
  async mediateProcess(query) {
    return init.mediatorQueryProcess.mediate({ query, context: ActionContext.ensureActionContext({ ...baseContext }) });
  },
  async preprocess() {
    return sequential.mediatorContextPreprocess
      .mediate({ context: ActionContext.ensureActionContext({ ...baseContext }), initialize: true });
  },
  async parse(query, state) {
    state.parsed = await sequential.parse(query, ActionContext.ensureActionContext({ ...baseContext }));
  },
  async identify(query, state) {
    state.identified = await identifier.run({ operation: state.parsed.operation, context: state.parsed.context });
  },
  async comparator(query, state) {
    state.comparator = await sequential.getLeanComparator(state.identified.context);
  },
  evaluate(query, state) {
    state.result = evaluator.evaluate(state.parsed.operation, state.identified.context, state.comparator);
  },
  serialize(query, state) {
    return HttpServiceSparqlEndpoint.serializeRawRows(state.result[Symbol.for('comunica.prototype.rawRows')]);
  },
};

const median = (a) => {
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', { ...baseContext });
  console.log(`query\t${Object.keys(steps).join('\t')}`);
  for (const { name, query } of queries) {
    const times = Object.fromEntries(Object.keys(steps).map(step => [ step, [] ]));
    for (let i = -200; i < Number(repsArg); i++) {
      const state = {};
      for (const [ step, run ] of Object.entries(steps)) {
        const start = performance.now();
        await run(query, state);
        if (i >= 0) {
          times[step].push(performance.now() - start);
        }
      }
    }
    console.log(`${name}\t${Object.values(times).map(t => median(t).toFixed(4)).join('\t')}`);
  }
  process.exit(0);
})();
