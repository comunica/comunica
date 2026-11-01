// In-process A/B benchmark of prototype toggles (globalThis.__proto flags), interleaving variants per round.
// Usage: node ab.js <engine-dir> <dataset> <rounds> <reps-per-round> <variants-json> <query-file>...
// variants-json: {"base":{},"parseCache":{"parseCache":true}}
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const [ engineDir, dataset, roundsArg, repsArg, variantsJson, ...queryFiles ] = process.argv.slice(2);
const variants = Object.entries(JSON.parse(variantsJson));
const { QueryEngine } = require(path.resolve(engineDir));
const engine = new QueryEngine();
const context = { sources: [ path.resolve(dataset) ] };
const queries = queryFiles.flatMap(file => fs.readFileSync(file, 'utf8').split(/\n\s*\n/u).map(q => q.trim())
  .filter(Boolean).map((query, i) => ({ name: `${path.basename(file, '.sparql')}#${i}`, query })));

async function runOnce(query) {
  const result = await engine.query(query, context);
  const { data } = await engine.resultToString(result, 'application/sparql-results+json');
  let out = '';
  await new Promise((resolve, reject) => {
    data.on('data', (chunk) => {
      out += chunk;
    });
    data.on('error', reject);
    data.on('end', resolve);
  });
  return out;
}

(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', context);
  // Check that all variants produce identical results
  const expected = new Map();
  for (const [ name, flags ] of variants) {
    globalThis.__proto = flags;
    for (const { name: q, query } of queries) {
      const sorted = JSON.stringify(JSON.parse(await runOnce(query)).results.bindings.map(b => JSON.stringify(b)).sort());
      if (!expected.has(q)) {
        expected.set(q, sorted);
      } else if (expected.get(q) !== sorted) {
        console.log(`RESULT MISMATCH for ${q} in variant ${name}`);
      }
    }
  }
  // Warm up all variants
  for (let i = 0; i < 3; i++) {
    for (const [ , flags ] of variants) {
      globalThis.__proto = flags;
      for (const { query } of queries) {
        await runOnce(query);
      }
    }
  }
  const perVariant = new Map(variants.map(([ name ]) => [ name, [] ]));
  const cpuPerVariant = new Map(variants.map(([ name ]) => [ name, [] ]));
  const perQuery = new Map(variants.map(([ name ]) => [ name, new Map() ]));
  for (let r = 0; r < Number(roundsArg); r++) {
    // Rotate the variant order per round to cancel drift
    const order = variants.map((_, i) => variants[(i + r) % variants.length]);
    for (const [ name, flags ] of order) {
      globalThis.__proto = flags;
      const start = performance.now();
      const cpuStart = process.cpuUsage();
      for (const { name: q, query } of queries) {
        for (let k = 0; k < Number(repsArg); k++) {
          const t0 = performance.now();
          await runOnce(query);
          const times = perQuery.get(name).get(q) ?? [];
          times.push(performance.now() - t0);
          perQuery.get(name).set(q, times);
        }
      }
      perVariant.get(name).push(performance.now() - start);
      const cpu = process.cpuUsage(cpuStart);
      cpuPerVariant.get(name).push((cpu.user + cpu.system) / 1000);
    }
  }
  const median = (a) => {
    const s = [ ...a ].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  };
  const executions = queries.length * Number(repsArg);
  const baseName = variants[0][0];
  const baseMedian = median(perVariant.get(baseName));
  console.log('variant\tround_median_ms\tper_query_ms\tvs_base\tsum_of_per_query_medians_ms\tcpu_per_query_ms');
  for (const [ name ] of variants) {
    const m = median(perVariant.get(name));
    const sumMedians = queries.reduce((acc, { name: q }) => acc + median(perQuery.get(name).get(q)), 0);
    console.log(`${name}\t${m.toFixed(1)}\t${(m / executions).toFixed(3)}\t${(m / baseMedian).toFixed(3)}\t${sumMedians.toFixed(2)}\t${(median(cpuPerVariant.get(name)) / executions).toFixed(3)}`);
  }
  if (process.env.PER_QUERY) {
    console.log(`\nper-query medians (ms): ${variants.map(([ n ]) => n).join(' / ')}`);
    for (const { name: q } of queries) {
      console.log(`${q}\t${variants.map(([ n ]) => median(perQuery.get(n).get(q)).toFixed(3)).join('\t')}`);
    }
  }
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
