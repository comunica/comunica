// Per-phase A/B: alternate flag sets on every execution, report median phase times per variant.
// Usage: node phase-ab.js <engine-dir> <dataset> <reps> <flags-json> <query-file>...
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const [ engineDir, dataset, repsArg, flagsJson, ...files ] = process.argv.slice(2);
const { QueryEngine } = require(path.resolve(engineDir));
const engine = new QueryEngine();
const context = { sources: [ path.resolve(dataset) ] };
const queries = files.flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean));
const variants = [ [ 'base', {} ], [ 'flags', JSON.parse(flagsJson) ] ];
let current = {};
const sequential = engine.actorInitQuery.mediatorQueryProcess.bus.actors.find(a => a.parse && a.optimize);
for (const phase of [ 'parse', 'optimize', 'evaluate' ]) {
  const original = sequential[phase].bind(sequential);
  sequential[phase] = async(...args) => {
    const start = performance.now();
    try {
      return await original(...args);
    } finally {
      current[phase] = performance.now() - start;
    }
  };
}
const median = (a) => {
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', context);
  const samples = { base: [], flags: [] };
  for (let r = 0; r < Number(repsArg) + 5; r++) {
    for (const q of queries) {
      for (const [ name, flags ] of (r % 2 ? variants : [ ...variants ].reverse())) {
        globalThis.__proto = flags;
        current = {};
        const start = performance.now();
        await (await engine.queryBindings(q, context)).toArray();
        current.total = performance.now() - start;
        current.consume = current.total - current.parse - current.optimize - current.evaluate;
        if (r >= 5) {
          samples[name].push(current);
        }
      }
    }
  }
  console.log('phase\tbase_median_ms\tflags_median_ms\tdelta_ms\trelative');
  for (const phase of [ 'parse', 'optimize', 'evaluate', 'consume', 'total' ]) {
    const b = median(samples.base.map(s => s[phase]));
    const f = median(samples.flags.map(s => s[phase]));
    console.log(`${phase}\t${b.toFixed(3)}\t${f.toFixed(3)}\t${(f - b).toFixed(3)}\t${(f / b).toFixed(3)}`);
  }
  process.exit(0);
})();
