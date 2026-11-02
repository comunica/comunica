// CPU profile of repeated engine.query plus raw SPARQL JSON serialization for one query, as in the endpoint.
// Usage: node perf-harness/query-profile.js <engine-dir> <dataset> <query-file> <reps> <out.cpuprofile>
// Env: FLAGS='{"x":true}' prototype flags.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const [ engineDir, dataset, file, reps, out ] = process.argv.slice(2);
require(path.resolve(__dirname, 'patches/traqula-runtime.js'));
globalThis.__proto = JSON.parse(process.env.FLAGS ?? '{}');
const { QueryEngine } = require(path.resolve(engineDir));
const { HttpServiceSparqlEndpoint } = require(path.resolve(__dirname, '../packages/actor-init-query/lib/HttpServiceSparqlEndpoint.js'));
const { LoggerPretty } = require(path.resolve(__dirname, '../packages/logger-pretty'));
const engine = new QueryEngine();
const baseContext = { sources: [ path.resolve(dataset) ], log: new LoggerPretty({ level: 'info' }), readOnly: true };
const query = fs.readFileSync(file, 'utf8').split(/\n\s*\n/u)[0].trim();
async function execute() {
  const result = await engine.query(query, { ...baseContext });
  const raw = result[Symbol.for('comunica.prototype.rawRows')];
  return raw ? HttpServiceSparqlEndpoint.serializeRawRows(raw) : HttpServiceSparqlEndpoint.serializeSparqlJson(result);
}
(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', { ...baseContext });
  for (let i = 0; i < 2000; i++) {
    await execute();
  }
  const inspector = require('node:inspector/promises');
  const session = new inspector.Session();
  session.connect();
  await session.post('Profiler.enable');
  await session.post('Profiler.setSamplingInterval', { interval: 25 });
  await session.post('Profiler.start');
  let busy = 0;
  for (let i = 0; i < Number(reps); i++) {
    // GAP_MS=x idles before each execution, like an endpoint between requests
    if (process.env.GAP_MS) {
      await new Promise(resolve => setTimeout(resolve, Number(process.env.GAP_MS)));
    }
    const start = performance.now();
    await execute();
    busy += performance.now() - start;
  }
  console.log(`per query ${(busy / Number(reps) * 1000).toFixed(1)} us (profiled)`);
  const { profile } = await session.post('Profiler.stop');
  fs.writeFileSync(out, JSON.stringify(profile));
  process.exit(0);
})();
