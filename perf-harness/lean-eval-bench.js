// Time only the evaluate step of the lean evaluators on parsed queries with identified sources, interleaved.
// Usage: node perf-harness/lean-eval-bench.js <engine-dir> <dataset> <reps> <query-file>...
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const [ engineDir, dataset, repsArg, ...files ] = process.argv.slice(2);
require(path.resolve(__dirname, 'patches/traqula-runtime.js'));
globalThis.__proto = JSON.parse(process.env.FLAGS ?? '{}');
const { QueryEngine } = require(path.resolve(engineDir));
const { ActionContext } = require(path.resolve(__dirname, '../packages/core'));
const lib = path.resolve(__dirname, '../packages/actor-query-process-sequential/lib');
const { LeanBgpEvaluator } = require(`${lib}/LeanBgpEvaluator.js`);
const { LeanEvaluator } = require(`${lib}/LeanEvaluator.js`);
const { HttpServiceSparqlEndpoint } = require(path.resolve(__dirname, '../packages/actor-init-query/lib/HttpServiceSparqlEndpoint.js'));
const engine = new QueryEngine();
const baseContext = { sources: [ path.resolve(dataset) ] };
const sequential = engine.actorInitQuery.mediatorQueryProcess.bus.actors.find(a => a.parse && a.optimize);
const identifier = sequential.mediatorOptimizeQueryOperation.bus.actors.find(a => a.name.endsWith('#query-source-identify'));
const comparatorFactory = sequential.mediatorQueryOperation.bus.actors.find(a => a.mediatorTermComparatorFactory)
  .mediatorTermComparatorFactory;
const queries = files.flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean)
  .map((query, i) => ({ name: `${path.basename(f, '.sparql')}#${i}`, query })));
const median = (a) => {
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', baseContext);
  console.log('query\tbgp\tgeneral\tcomparator');
  for (const { name, query } of queries) {
    const times = { bgp: [], general: [], comparator: [] };
    for (let i = -100; i < Number(repsArg); i++) {
      // Fresh parse per repetition, as caches are keyed by operation
      const parsed = await sequential.parse(query, ActionContext.ensureActionContext(baseContext));
      const { context } = await identifier.run({ operation: parsed.operation, context: parsed.context });
      let start = performance.now();
      const bgpResult = LeanBgpEvaluator.getPlan(parsed.operation) && new LeanBgpEvaluator().evaluate(parsed.operation, context);
      if (bgpResult) {
        HttpServiceSparqlEndpoint.serializeRawRows(bgpResult[Symbol.for('comunica.prototype.rawRows')]);
      }
      const bgpTime = performance.now() - start;
      start = performance.now();
      const comparator = LeanEvaluator.needsComparator(parsed.operation) ?
        await comparatorFactory.mediate({ context }) :
        undefined;
      const comparatorTime = performance.now() - start;
      const reparsed = await sequential.parse(query, ActionContext.ensureActionContext(baseContext));
      start = performance.now();
      const evaluator = new LeanEvaluator();
      const generalResult = LeanEvaluator.isSupported(reparsed.operation) && evaluator.evaluate(reparsed.operation, context, comparator);
      if (generalResult) {
        HttpServiceSparqlEndpoint.serializeRawRows(generalResult[Symbol.for('comunica.prototype.rawRows')]);
      }
      const generalTime = performance.now() - start;
      if (i >= 0) {
        times.bgp.push(bgpResult ? bgpTime : Number.NaN);
        times.general.push(generalResult ? generalTime : Number.NaN);
        times.comparator.push(comparatorTime);
      }
    }
    console.log(`${name}\t${median(times.bgp).toFixed(4)}\t${median(times.general).toFixed(4)}\t${median(times.comparator).toFixed(4)}`);
  }
  process.exit(0);
})();
