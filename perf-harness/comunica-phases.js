// Per-query phase medians of Comunica, comparable to perf-harness/oxbench: parse, optimize, evaluate, consume, serialize.
// Usage: node perf-harness/comunica-phases.js <engine-dir> <dataset> <reps> <query-file>...
// Env: FLAGS='{"x":true}' sets globalThis.__proto for prototype toggles.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const [ engineDir, dataset, repsArg, ...files ] = process.argv.slice(2);
globalThis.__proto = JSON.parse(process.env.FLAGS ?? '{}');
const { QueryEngine } = require(path.resolve(engineDir));
const engine = new QueryEngine();
const context = { sources: [ path.resolve(dataset) ] };
if (process.env.LOGGER) {
  const { LoggerPretty } = require(path.resolve(__dirname, '../packages/logger-pretty'));
  context.log = new LoggerPretty({ level: process.env.LOGGER });
}
const queries = files.flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean)
  .map((query, i) => ({ name: `${path.basename(f, '.sparql')}#${i}`, query })));

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

async function consume(query) {
  current = {};
  const start = performance.now();
  const bindings = await (await engine.queryBindings(query, context)).toArray();
  current.total = performance.now() - start;
  current.consume = current.total - current.parse - current.optimize - current.evaluate;
  return bindings.length;
}

async function serialized(query) {
  const start = performance.now();
  const { data } = await engine.resultToString(await engine.query(query, context), 'application/sparql-results+json');
  await new Promise((resolve, reject) => data.on('data', () => {}).on('error', reject).on('end', resolve));
  return performance.now() - start;
}

const median = (a) => {
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', context);
  for (let i = 0; i < 20; i++) {
    for (const { query } of queries) {
      await consume(query);
      await serialized(query);
    }
  }
  console.log('query\tresults\tparse\toptimize\tevaluate\tconsume\ttotal\ttotal_with_json');
  for (const { name, query } of queries) {
    const samples = [];
    const json = [];
    let n;
    for (let i = 0; i < Number(repsArg); i++) {
      n = await consume(query);
      samples.push(current);
      json.push(await serialized(query));
    }
    const m = phase => median(samples.map(s => s[phase])).toFixed(3);
    console.log(`${name}\t${n}\t${m('parse')}\t${m('optimize')}\t${m('evaluate')}\t${m('consume')}\t${m('total')}\t${median(json).toFixed(3)}`);
  }
  process.exit(0);
})();
