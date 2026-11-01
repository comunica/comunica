// Check whether repeated query executions retain memory, by forcing full GCs between batches.
// Usage: node --expose-gc leak-check.js <engine-dir> <dataset> <batches> <batch-size> <query-file>
const fs = require('node:fs');
const path = require('node:path');
const [ engineDir, dataset, batches, batchSize, queryFile ] = process.argv.slice(2);
const { QueryEngine } = require(path.resolve(engineDir));
const engine = new QueryEngine();
const context = { sources: [ path.resolve(dataset) ] };
const query = fs.readFileSync(queryFile, 'utf8').split(/\n\s*\n/u)[0];
(async() => {
  await engine.queryBoolean('ASK { ?s ?p ?o }', context);
  for (let b = 0; b <= Number(batches); b++) {
    global.gc();
    console.log(`after ${b * batchSize} queries: heapUsed ${(process.memoryUsage().heapUsed / 1e6).toFixed(1)} MB`);
    for (let i = 0; i < Number(batchSize); i++) {
      await (await engine.queryBindings(query, context)).toArray();
    }
  }
  process.exit(0);
})();
