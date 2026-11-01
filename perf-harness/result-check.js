// Verify that repeated executions with the parse cache return the same results as without it.
const fs = require('node:fs');
const path = require('node:path');
const [ engineDir, dataset, ...files ] = process.argv.slice(2);
const { QueryEngine } = require(path.resolve(engineDir));
const engine = new QueryEngine();
const context = { sources: [ path.resolve(dataset) ] };
const queries = files.flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean)
  .map((q, i) => [ `${path.basename(f, '.sparql')}#${i}`, q ]));
// ORDERED=1 also compares the order of results of queries with ORDER BY
const run = async(q) => {
  const rows = (await (await engine.queryBindings(q, context)).toArray())
    .map(b => JSON.stringify([ ...b ].map(([ k, v ]) => [ k.value, v.termType, v.value, v.datatype?.value, v.language ])
      .sort((x, y) => x[0].localeCompare(y[0]))));
  return JSON.stringify(process.env.ORDERED && /ORDER BY/iu.test(q) ? rows : rows.sort());
};
// Count how often the lean evaluators return a result
const leanStats = { hit: 0, miss: 0 };
for (const file of [ 'LeanEvaluator', 'LeanBgpEvaluator' ]) {
  const module = require(path.resolve(__dirname, `../packages/actor-query-process-sequential/lib/${file}.js`));
  const evaluator = module[file];
  const evaluate = evaluator.prototype.evaluate;
  evaluator.prototype.evaluate = function(...args) {
    const result = evaluate.apply(this, args);
    leanStats[result ? 'hit' : 'miss']++;
    return result;
  };
  // LEAN_DEBUG=1 prints why the lean evaluator falls back
  const evaluatePattern = evaluator.prototype.evaluatePattern;
  if (evaluatePattern && process.env.LEAN_DEBUG) {
    evaluator.prototype.evaluatePattern = function(...args) {
      try {
        return evaluatePattern.apply(this, args);
      } catch (error) {
        if (!error.logged) {
          error.logged = true;
          console.log(`  lean fallback: ${error.message}`);
        }
        throw error;
      }
    };
  }
}
(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', context);
  let failures = 0;
  for (const [ name, q ] of queries) {
    if (process.env.LEAN_DEBUG) {
      console.log(name);
    }
    globalThis.__proto = {};
    const expected = await run(q);
    globalThis.__proto = JSON.parse(process.env.FLAGS ?? '{"parseCache":true}');
    for (let i = 0; i < 4; i++) {
      const actual = await run(q);
      if (actual !== expected) {
        failures++;
        console.log(`MISMATCH ${name} on execution ${i}`);
        if (process.env.SHOW) {
          console.log(`  expected ${expected.slice(0, 600)}\n  actual   ${actual.slice(0, 600)}`);
        }
      }
    }
  }
  console.log(`${queries.length} queries, ${failures} mismatches, lean evaluations: ${leanStats.hit} hits, ${leanStats.miss} fallbacks`);
  process.exit(0);
})();
