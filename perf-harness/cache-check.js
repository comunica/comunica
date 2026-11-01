// Verify that repeated executions with the parse cache return the same results as without it.
const fs = require('node:fs');
const path = require('node:path');
const [ engineDir, dataset, ...files ] = process.argv.slice(2);
const { QueryEngine } = require(path.resolve(engineDir));
const engine = new QueryEngine();
const context = { sources: [ path.resolve(dataset) ] };
const queries = files.flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean)
  .map((q, i) => [ `${path.basename(f, '.sparql')}#${i}`, q ]));
const run = async q => JSON.stringify((await (await engine.queryBindings(q, context)).toArray())
  .map(b => b.toString()).sort());
(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', context);
  let failures = 0;
  for (const [ name, q ] of queries) {
    globalThis.__proto = {};
    const expected = await run(q);
    globalThis.__proto = JSON.parse(process.env.FLAGS ?? '{"parseCache":true}');
    for (let i = 0; i < 4; i++) {
      if (await run(q) !== expected) {
        failures++;
        console.log(`MISMATCH ${name} on cached execution ${i}`);
      }
    }
  }
  console.log(`${queries.length} queries, ${failures} mismatches`);
  process.exit(0);
})();
