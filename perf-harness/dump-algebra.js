// Print the algebra that the SPARQL parse actor produces for the given queries, in a compact JSON form.
// Usage: node perf-harness/dump-algebra.js <query-file>...
const fs = require('node:fs');
const path = require('node:path');
const P = path.resolve(__dirname, '../packages');
const { toAlgebra } = require(require.resolve('@traqula/algebra-sparql-1-2', { paths: [ `${P}/actor-query-parse-sparql` ] }));
const { Parser } = require(require.resolve('@traqula/parser-sparql-1-2', { paths: [ `${P}/actor-query-parse-sparql` ] }));
const { AstFactory } = require(require.resolve('@traqula/rules-sparql-1-2', { paths: [ `${P}/actor-query-parse-sparql` ] }));
const { DataFactory } = require('rdf-data-factory');
const dataFactory = new DataFactory();
const parser = new Parser({ lexerConfig: { positionTracking: 'full' } });
function compact(value) {
  if (Array.isArray(value)) {
    return value.map(compact);
  }
  if (value && typeof value === 'object') {
    if (value.type === 'pattern') {
      return `PATTERN(${[ value.subject, value.predicate, value.object, value.graph ].map(t => compact(t)).join(' ')})${Object.keys(value).filter(k => ![ 'type', 'subject', 'predicate', 'object', 'graph', 'termType', 'value' ].includes(k)).map(k => ` +${k}`).join('')}`;
    }
    if (value.termType) {
      return value.termType === 'Literal' ? `"${value.value}"^^${value.datatype.value}${value.language ? `@${value.language}` : ''}` :
        `${value.termType}(${value.value})`;
    }
    return Object.fromEntries(Object.entries(value).map(([ k, v ]) => [ k, compact(v) ]));
  }
  return value;
}
for (const file of process.argv.slice(2)) {
  const query = fs.readFileSync(file, 'utf8').split(/\n\s*\n/u)[0];
  const ast = parser.parse(query, { astFactory: new AstFactory(), baseIRI: 'http://localhost:3000/sparql' });
  const algebra = toAlgebra(ast, { quads: true, blankToVariable: true, baseIRI: 'http://localhost:3000/sparql', dataFactory });
  console.log(`=== ${path.basename(file)}\n${JSON.stringify(compact(algebra), null, 1)}`);
}
