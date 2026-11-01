// HTTP latency benchmark against a SPARQL endpoint, measuring until the full body is read.
// Usage: node http-bench.js <endpoint> <reps> <query-file>...
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const [ endpoint, repsArg, ...queryFiles ] = process.argv.slice(2);
const reps = Number(repsArg);
const all = queryFiles.flatMap(file => fs.readFileSync(file, 'utf8').split(/\n\s*\n/u).map(q => q.trim())
  .filter(Boolean).map((query, i) => ({ name: `${path.basename(file, '.sparql')}#${i}`, query })));

async function runOnce(query) {
  const start = performance.now();
  const url = `${endpoint}?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { accept: 'application/sparql-results+json' } });
  const body = await response.text();
  const time = performance.now() - start;
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
  }
  return { time, count: JSON.parse(body).results?.bindings?.length };
}

(async() => {
  const warmup = Number(process.env.WARMUP ?? 3);
  for (let i = 0; i < warmup; i++) {
    for (const { query } of all) {
      await runOnce(query);
    }
  }
  console.log('query\tresults\tmedian_ms\tmean_ms\tmin_ms\tmax_ms');
  const summary = { median: 0, mean: 0 };
  for (const { name, query } of all) {
    const times = [];
    let count;
    for (let i = 0; i < reps; i++) {
      const r = await runOnce(query);
      times.push(r.time);
      count = r.count;
    }
    times.sort((a, b) => a - b);
    const mean = times.reduce((a, b) => a + b, 0) / reps;
    summary.median += times[Math.floor(reps / 2)];
    summary.mean += mean;
    console.log(`${name}\t${count}\t${times[Math.floor(reps / 2)].toFixed(2)}\t${mean.toFixed(2)}\t${times[0].toFixed(2)}\t${times.at(-1).toFixed(2)}`);
  }
  console.log(`SUM\t\t${summary.median.toFixed(1)}\t${summary.mean.toFixed(1)}`);
})();
