// In-process ablation of prototype flags: executes every query under every flag variant, interleaved in rotating order,
// and reports per variant the sum of per-query medians and the geometric mean of per-query ratios to the first variant.
// Usage: node perf-harness/ablation.js <engine-dir> <dataset> <reps> <variants.json> <out.json> <query-file>...
// Env: MAX_PER_FILE limits the number of queries per file.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const [ engineDir, dataset, repsArg, variantsFile, outFile, ...files ] = process.argv.slice(2);
require(path.resolve(__dirname, 'patches/traqula-runtime.js'));
const { QueryEngine } = require(path.resolve(engineDir));
const { HttpServiceSparqlEndpoint } = require(path.resolve(__dirname, '../packages/actor-init-query/lib/HttpServiceSparqlEndpoint.js'));
const { LoggerPretty } = require(path.resolve(__dirname, '../packages/logger-pretty'));

const engine = new QueryEngine();
const baseContext = { sources: [ path.resolve(dataset) ], log: new LoggerPretty({ level: 'info' }), readOnly: true };
const variants = Object.entries(JSON.parse(fs.readFileSync(variantsFile, 'utf8')));
const maxPerFile = Number(process.env.MAX_PER_FILE ?? Number.POSITIVE_INFINITY);
const queries = files.flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean)
  .slice(0, maxPerFile).map((query, i) => ({ file: path.basename(f).replace(/\.[^.]+$/u, ''), name: `${path.basename(f)}#${i}`, query })));

// Consume results like an endpoint would
async function execute(query) {
  const result = await engine.query(query, { ...baseContext });
  if (result.resultType === 'bindings') {
    const raw = result[Symbol.for('comunica.prototype.rawRows')];
    return raw ? HttpServiceSparqlEndpoint.serializeRawRows(raw) : HttpServiceSparqlEndpoint.serializeSparqlJson(result);
  }
  if (result.resultType === 'quads') {
    return (await result.execute()).toArray();
  }
  return result.execute();
}

const median = (a) => {
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', { ...baseContext });
  const results = {};
  const startAll = performance.now();
  for (const [ index, { name, file, query } ] of queries.entries()) {
    const times = Object.fromEntries(variants.map(([ variant ]) => [ variant, [] ]));
    for (let rep = -2; rep < Number(repsArg); rep++) {
      for (let v = 0; v < variants.length; v++) {
        // Rotate the order of variants per repetition, so no variant always follows the same one
        const [ variant, flags ] = variants[(v + rep + variants.length) % variants.length];
        globalThis.__proto = flags;
        const start = performance.now();
        await execute(query);
        if (rep >= 0) {
          times[variant].push(performance.now() - start);
        }
      }
    }
    results[name] = { file, medians: Object.fromEntries(Object.entries(times).map(([ v, t ]) => [ v, median(t) ])) };
    process.stderr.write(`${index + 1}/${queries.length} ${name} ${((performance.now() - startAll) / 1000).toFixed(0)} s\n`);
  }
  fs.writeFileSync(outFile, JSON.stringify({ variants: variants.map(([ v ]) => v), results }, null, 1));
  process.exit(0);
})();
