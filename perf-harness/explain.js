// Print the physical plans of the first instance of each given query template.
// Usage: node explain.js <engine-dir> <dataset> <query-file>...
const fs = require('node:fs');
const path = require('node:path');
const [ engineDir, dataset, ...files ] = process.argv.slice(2);
const { QueryEngine } = require(path.resolve(engineDir));
const engine = new QueryEngine();
const context = { sources: [ path.resolve(dataset) ] };
(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', context);
  for (const file of files) {
    const query = fs.readFileSync(file, 'utf8').split(/\n\s*\n/u)[0];
    const { data } = await engine.explain(query, context, 'physical');
    console.log(`=== ${path.basename(file)}\n${data}`);
  }
  process.exit(0);
})();
