// Interleaved per-query A/B of the endpoint's in-process work: engine.query plus SPARQL JSON serialization.
// Usage: node perf-harness/query-ab.js <engine-dir> <dataset> <reps> <query-file>...
// Env: BASE_FLAGS and FLAGS are the prototype flags (JSON) of the two variants.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const [ engineDir, dataset, repsArg, ...files ] = process.argv.slice(2);
require(path.resolve(__dirname, 'patches/traqula-runtime.js'));
const { QueryEngine } = require(path.resolve(engineDir));
const { HttpServiceSparqlEndpoint } = require(path.resolve(__dirname, '../packages/actor-init-query/lib/HttpServiceSparqlEndpoint.js'));
const { LoggerPretty } = require(path.resolve(__dirname, '../packages/logger-pretty'));

const engine = new QueryEngine();
const baseContext = { sources: [ path.resolve(dataset) ], log: new LoggerPretty({ level: 'info' }), readOnly: true };
const queries = files.flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean)
  .map((query, i) => ({ name: `${path.basename(f, '.sparql')}#${i}`, query })));
const variants = [ [ 'base', JSON.parse(process.env.BASE_FLAGS ?? '{}') ], [ 'flags', JSON.parse(process.env.FLAGS ?? '{}') ] ];

async function execute(query) {
  const result = await engine.query(query, { ...baseContext });
  const raw = result[Symbol.for('comunica.prototype.rawRows')];
  return raw ? HttpServiceSparqlEndpoint.serializeRawRows(raw) : HttpServiceSparqlEndpoint.serializeSparqlJson(result);
}

const median = (a) => {
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', { ...baseContext });
  console.log('query\tbase\tflags\tratio');
  for (const { name, query } of queries) {
    const times = { base: [], flags: [] };
    const reps = Number(repsArg);
    for (let i = -Math.min(50, reps); i < reps; i++) {
      for (const [ variant, flags ] of variants) {
        globalThis.__proto = flags;
        // GAP_MS=x idles before each execution, like an endpoint between requests
        if (process.env.GAP_MS) {
          if (process.env.GAP_MODE === 'spin') {
            // Busy-wait instead of idling, to separate CPU idle effects from cache effects
            const until = performance.now() + Number(process.env.GAP_MS);
            while (performance.now() < until) {
              // Spin
            }
            await new Promise(resolve => setImmediate(resolve));
          } else if (process.env.GAP_MODE === 'immediate') {
            await new Promise(resolve => setImmediate(resolve));
          } else {
            await new Promise(resolve => setTimeout(resolve, Number(process.env.GAP_MS)));
          }
        }
        const start = performance.now();
        await execute(query);
        if (i >= 0) {
          times[variant].push(performance.now() - start);
        }
      }
    }
    const base = median(times.base);
    const flags = median(times.flags);
    console.log(`${name}\t${base.toFixed(3)}\t${flags.toFixed(3)}\t${(flags / base).toFixed(2)}`);
  }
  process.exit(0);
})();
