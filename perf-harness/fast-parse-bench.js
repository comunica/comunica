// Micro-benchmark of the fast SPARQL parser prototype, per query, in microseconds.
// Usage: node perf-harness/fast-parse-bench.js <reps> <query-file>...
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const P = path.resolve(__dirname, '../packages');
const { DataFactory } = require(require.resolve('rdf-data-factory', { paths: [ `${P}/actor-query-parse-sparql` ] }));
const { FastSparqlParser } = require(`${P}/actor-query-parse-sparql/lib/FastSparqlParser.js`);
const prefixes = Object.freeze({
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  schema: 'http://schema.org/',
});
const [ repsArg, ...files ] = process.argv.slice(2);
const queries = files.flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean)
  .map((query, i) => ({ name: `${path.basename(f, '.sparql')}#${i}`, query })));
const median = (a) => {
  const s = [ ...a ].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
for (const { name, query } of queries) {
  const times = [];
  for (let i = -500; i < Number(repsArg); i++) {
    const start = performance.now();
    try {
      new FastSparqlParser(new DataFactory()).parse(query, prefixes);
    } catch {
      break;
    }
    if (i >= 0) {
      times.push(performance.now() - start);
    }
  }
  if (times.length > 0) {
    console.log(`${name}\t${(median(times) * 1000).toFixed(1)} us`);
  }
}
