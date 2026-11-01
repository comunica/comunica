// Interleaved A/B over HTTP: alternates prototype flag variants per request (x-proto header), reports client medians.
// Usage: node http-ab.js <endpoint> <reps> <variants-json> <query-file>...
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const [ endpoint, repsArg, variantsJson, ...files ] = process.argv.slice(2);
const variants = Object.entries(JSON.parse(variantsJson));
const queries = files.flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean)
  .map((query, i) => ({ name: `${path.basename(f, '.sparql')}#${i}`, query })));

async function runOnce(query, flags) {
  const start = performance.now();
  const response = await fetch(`${endpoint}?query=${encodeURIComponent(query)}`, {
    headers: { accept: 'application/sparql-results+json', 'x-proto': JSON.stringify(flags) },
  });
  const body = await response.text();
  const time = performance.now() - start;
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
  }
  return { time, body };
}

const median = (a) => {
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

(async() => {
  // Check identical results, then warm up
  for (const { name, query } of queries) {
    const bodies = new Set();
    for (const [ , flags ] of variants) {
      const { bindings } = JSON.parse((await runOnce(query, flags)).body).results;
      bodies.add(JSON.stringify(bindings.map(b => JSON.stringify(b)).sort()));
    }
    if (bodies.size > 1) {
      console.log(`RESULT MISMATCH for ${name}`);
    }
  }
  for (let i = 0; i < Number(process.env.WARMUP ?? 10); i++) {
    for (const { query } of queries) {
      for (const [ , flags ] of variants) {
        await runOnce(query, flags);
      }
    }
  }
  const times = new Map(variants.map(([ v ]) => [ v, new Map() ]));
  for (let r = 0; r < Number(repsArg); r++) {
    for (const { name, query } of queries) {
      for (const [ v, flags ] of (r % 2 ? variants : [ ...variants ].reverse())) {
        const list = times.get(v).get(name) ?? [];
        list.push((await runOnce(query, flags)).time);
        times.get(v).set(name, list);
      }
    }
  }
  console.log(`query\t${variants.map(([ v ]) => v).join('\t')}`);
  const sums = variants.map(() => 0);
  for (const { name } of queries) {
    const meds = variants.map(([ v ]) => median(times.get(v).get(name)));
    meds.forEach((m, i) => {
      sums[i] += m;
    });
    console.log(`${name}\t${meds.map(m => m.toFixed(3)).join('\t')}`);
  }
  console.log(`SUM\t${sums.map(m => m.toFixed(2)).join('\t')}\t(${variants.map(([ v ], i) => `${v} ${(sums[i] / sums[0]).toFixed(3)}`).join(', ')})`);
})();
