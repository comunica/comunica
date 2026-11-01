// In-process latency benchmark of selective queries over a file source.
// Usage: node bench.js <engine-dir> <dataset> <reps> <query-file>...
// Env: PHASES=1 to time parse/optimize/evaluate/consume, SERIALIZE=1 to serialize to SPARQL JSON.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const [ engineDir, dataset, repsArg, ...queryFiles ] = process.argv.slice(2);
const reps = Number(repsArg);
const { QueryEngine } = require(path.resolve(engineDir));
const engine = new QueryEngine();
const context = { sources: [ path.resolve(dataset) ] };

function instances(file) {
  return fs.readFileSync(file, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean)
    .map((q, i) => ({ name: `${path.basename(file, '.sparql')}#${i}`, query: q }));
}

// Phase timing by wrapping the sequential query process actor
const phases = { parse: 0, optimize: 0, evaluate: 0 };
async function installPhaseTimers() {
  const target = engine.actorInitQuery.mediatorQueryProcess.bus.actors.find(actor => actor.parse && actor.optimize);
  if (!target) {
    console.error('no sequential query processor found');
    return;
  }
  const parseActor = engine.actorInitQuery.mediatorQueryProcess.bus.actors[0].mediatorQueryParse.bus.actors
    .find(actor => actor.parser);
  const parser = parseActor.parser;
  const parse = parser.parse.bind(parser);
  phases.syncParse = 0;
  parser.parse = (...args) => {
    const start = performance.now();
    try {
      return parse(...args);
    } finally {
      phases.syncParse += performance.now() - start;
    }
  };
  const run = parseActor.run.bind(parseActor);
  phases.parseActorRun = 0;
  parseActor.run = (...args) => {
    const start = performance.now();
    const output = run(...args);
    output.then(() => {
      phases.parseActorRun += performance.now() - start;
    });
    return output;
  };
  for (const phase of [ 'parse', 'optimize', 'evaluate' ]) {
    const original = target[phase].bind(target);
    target[phase] = async(...args) => {
      const start = performance.now();
      try {
        return await original(...args);
      } finally {
        phases[phase] += performance.now() - start;
      }
    };
  }
}

// Inclusive run time and test (mediation) time per actor, via @comunica/core
const actorRun = new Map();
const busTest = new Map();
let measureActors = false;
function installActorTimers() {
  const core = require(require.resolve('@comunica/core', { paths: [ path.resolve(engineDir) ] }));
  const runObservable = core.Actor.prototype.runObservable;
  core.Actor.prototype.runObservable = function(action, sideData) {
    if (!measureActors) {
      return runObservable.call(this, action, sideData);
    }
    const start = performance.now();
    const output = runObservable.call(this, action, sideData);
    const record = () => {
      const e = actorRun.get(this.name) ?? { n: 0, t: 0 };
      e.n++;
      e.t += performance.now() - start;
      actorRun.set(this.name, e);
    };
    output.then(record, record);
    return output;
  };
  const publish = core.Bus.prototype.publish;
  core.Bus.prototype.publish = function(action) {
    const replies = publish.call(this, action);
    if (measureActors) {
      const start = performance.now();
      const record = () => {
        const e = busTest.get(this.name) ?? { n: 0, t: 0, actors: replies.length };
        e.n++;
        e.t += performance.now() - start;
        busTest.set(this.name, e);
      };
      Promise.allSettled(replies.map(r => r.reply)).then(record);
    }
    return replies;
  };
}
if (process.env.ACTORS) {
  installActorTimers();
}

async function runOnce(query) {
  const start = performance.now();
  let count = 0;
  if (process.env.SERIALIZE) {
    const result = await engine.query(query, context);
    const { data } = await engine.resultToString(result, 'application/sparql-results+json');
    await new Promise((resolve, reject) => {
      data.on('data', () => count++);
      data.on('error', reject);
      data.on('end', resolve);
    });
  } else {
    const bindings = await (await engine.queryBindings(query, context)).toArray();
    count = bindings.length;
  }
  return { time: performance.now() - start, count };
}

(async() => {
  const t0 = performance.now();
  await engine.queryBoolean('ASK { ?s ?p ?o }', context);
  console.error(`load ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  if (process.env.PHASES) {
    await installPhaseTimers();
  }
  const all = queryFiles.flatMap(instances);
  // Warm up the JIT over all queries
  for (let i = 0; i < 3; i++) {
    for (const { query } of all) {
      await runOnce(query);
    }
  }
  let session;
  if (process.env.PROFILE) {
    const inspector = require('node:inspector/promises');
    session = new inspector.Session();
    session.connect();
    await session.post('Profiler.enable');
    await session.post('Profiler.setSamplingInterval', { interval: 100 });
    await session.post('Profiler.start');
  }
  measureActors = Boolean(process.env.ACTORS);
  console.log('query\tresults\tmedian_ms\tmin_ms\tparse\toptimize\tevaluate\tconsume');
  for (const { name, query } of all) {
    const times = [];
    let count;
    for (const k of Object.keys(phases)) {
      phases[k] = 0;
    }
    for (let i = 0; i < reps; i++) {
      const r = await runOnce(query);
      times.push(r.time);
      count = r.count;
    }
    times.sort((a, b) => a - b);
    const total = times.reduce((a, b) => a + b, 0);
    const p = k => (phases[k] / reps).toFixed(2);
    const consume = `${((total - phases.parse - phases.optimize - phases.evaluate) / reps).toFixed(2)}\tsyncParse ${p('syncParse')}\tparseActorRun ${p('parseActorRun')}`;
    console.log(`${name}\t${count}\t${times[Math.floor(reps / 2)].toFixed(2)}\t${times[0].toFixed(2)}\t${p('parse')}\t${p('optimize')}\t${p('evaluate')}\t${process.env.PHASES ? consume : ''}`);
  }
  if (process.env.ACTORS) {
    const runs = all.length * reps;
    const dump = (title, m) => {
      console.log(`\n== ${title} (ms per query execution, calls per query execution)`);
      for (const [ k, v ] of [ ...m ].sort((a, b) => b[1].t - a[1].t).slice(0, 45)) {
        console.log(`${(v.t / runs).toFixed(3).padStart(8)}  ${(v.n / runs).toFixed(1).padStart(6)}  ${k}${v.actors ? ` (${v.actors} actors)` : ''}`);
      }
    };
    dump('actor run, inclusive', actorRun);
    dump('bus test phase', busTest);
  }
  if (session) {
    const { profile } = await session.post('Profiler.stop');
    fs.writeFileSync(process.env.PROFILE, JSON.stringify(profile));
  }
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
