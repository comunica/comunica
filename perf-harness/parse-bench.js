// Micro-benchmark of SPARQL parsing (AST) and algebra translation, as done by actor-query-parse-sparql.
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const paths = [ '/home/user/comunica/packages/actor-query-parse-sparql' ];
const req = m => require(require.resolve(m, { paths }));
const { toAlgebra } = req('@traqula/algebra-sparql-1-2');
const { Parser } = req('@traqula/parser-sparql-1-2');
const { AstFactory } = req('@traqula/rules-sparql-1-2');
const { DataFactory } = require(require.resolve('rdf-data-factory', { paths }));
const dataFactory = new DataFactory();
async function main() {
if (process.env.LOAD) {
  const { QueryEngine } = require('/home/user/comunica/engines/query-sparql-file');
  const engine = new QueryEngine();
  await engine.queryBoolean('ASK { ?s ?p ?o }', { sources: [ process.env.LOAD ] });
  globalThis.keep = engine;
  console.log(`loaded, heapUsed ${(process.memoryUsage().heapUsed / 1e6).toFixed(0)} MB`);
}
const queries = process.argv.slice(2).flatMap(f => fs.readFileSync(f, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean));
const prefixes = Object.freeze({
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#', xsd: 'http://www.w3.org/2001/XMLSchema#', dc: 'http://purl.org/dc/terms/',
  dcterms: 'http://purl.org/dc/terms/', dc11: 'http://purl.org/dc/elements/1.1/', foaf: 'http://xmlns.com/foaf/0.1/',
  geo: 'http://www.w3.org/2003/01/geo/wgs84_pos#', dbpedia: 'http://dbpedia.org/resource/',
  'dbpedia-owl': 'http://dbpedia.org/ontology/', dbpprop: 'http://dbpedia.org/property/', schema: 'http://schema.org/',
  skos: 'http://www.w3.org/2008/05/skos#',
});
const baseIRI = 'http://localhost:3000/sparql';
for (const [ tracking, withPrefixes ] of [ [ 'full', false ], [ 'full', true ], [ 'onlyOffset', true ] ]) {
  const parser = new Parser({ lexerConfig: { positionTracking: tracking } });
  const run = (n) => {
    let tParse = 0;
    let tAlg = 0;
    for (let i = 0; i < n; i++) {
      for (const q of queries) {
        const t0 = performance.now();
        const ast = parser.parse(q, withPrefixes ? { prefixes, baseIRI, astFactory: new AstFactory() } : { astFactory: new AstFactory() });
        const t1 = performance.now();
        toAlgebra(ast, withPrefixes ? { quads: true, prefixes, blankToVariable: true, baseIRI, dataFactory } : { quads: true, blankToVariable: true, dataFactory });
        tParse += t1 - t0;
        tAlg += performance.now() - t1;
      }
    }
    return [ tParse / n / queries.length, tAlg / n / queries.length ];
  };
  run(300);
  const [ p, a ] = run(1000);
  console.log(`${tracking}${withPrefixes ? ' +prefixes+baseIRI' : ''}: parse ${p.toFixed(3)} ms, toAlgebra ${a.toFixed(3)} ms per query (avg over ${queries.length} queries)`);
}
}
main();
