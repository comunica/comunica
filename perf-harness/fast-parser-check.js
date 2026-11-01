// Compare the algebra of the fast parser prototype with that of traqula's parser and toAlgebra.
// Usage: node perf-harness/fast-parser-check.js <query-file>...
const fs = require('node:fs');
const path = require('node:path');
const P = path.resolve(__dirname, '../packages');
const paths = [ `${P}/actor-query-parse-sparql` ];
const { toAlgebra } = require(require.resolve('@traqula/algebra-sparql-1-2', { paths }));
const { Parser } = require(require.resolve('@traqula/parser-sparql-1-2', { paths }));
const { AstFactory } = require(require.resolve('@traqula/rules-sparql-1-2', { paths }));
const { DataFactory } = require('rdf-data-factory');
const { FastSparqlParser, FastParserFallbackError } = require(`${P}/actor-query-parse-sparql/lib/FastSparqlParser.js`);

const dataFactory = new DataFactory();
const prefixes = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  foaf: 'http://xmlns.com/foaf/0.1/',
};
const baseIRI = 'http://localhost:3000/sparql';
const parser = new Parser({ lexerConfig: { positionTracking: 'full' } });

function diff(a, b, at) {
  if (a === b) {
    return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (a.termType || b.termType) {
      if (a.termType === 'Quad' && b.termType === 'Quad' && a.type === b.type) {
        // Patterns are quads with extra keys
      } else if (!a.equals?.(b)) {
        return `${at}: ${a.termType}(${a.value}) != ${b.termType}(${b.value})`;
      } else {
        return;
      }
    }
    if (Array.isArray(a) !== Array.isArray(b)) {
      return `${at}: array mismatch`;
    }
    const keys = new Set([ ...Object.keys(a), ...Object.keys(b) ]);
    for (const key of keys) {
      if (a[key] === undefined && b[key] === undefined) {
        continue;
      }
      const result = diff(a[key], b[key], `${at}.${key}`);
      if (result) {
        return result;
      }
    }
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b) && !(a.termType && b.termType)) {
      return `${at}: prototype mismatch`;
    }
    return;
  }
  return `${at}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
}

let equal = 0;
let fallback = 0;
let different = 0;
for (const file of process.argv.slice(2)) {
  const queries = fs.readFileSync(file, 'utf8').split(/\n\s*\n/u).map(q => q.trim()).filter(Boolean);
  for (const [ i, query ] of queries.entries()) {
    const name = `${path.basename(file, '.sparql')}#${i}`;
    let expected;
    try {
      const ast = parser.parse(query, { prefixes, baseIRI, astFactory: new AstFactory() });
      expected = toAlgebra(ast, { quads: true, prefixes, blankToVariable: true, baseIRI, dataFactory });
    } catch (error) {
      expected = error;
    }
    let actual;
    try {
      actual = new FastSparqlParser(dataFactory).parse(query, prefixes);
    } catch (error) {
      if (error instanceof FastParserFallbackError) {
        fallback++;
        console.log(`fallback  ${name}: ${error.message}`);
        continue;
      }
      throw error;
    }
    if (expected instanceof Error) {
      different++;
      console.log(`DIFFERENT ${name}: traqula failed (${expected.message}) but the fast parser did not`);
      continue;
    }
    const result = diff(actual, expected, 'root');
    if (result) {
      different++;
      console.log(`DIFFERENT ${name}: ${result}`);
    } else {
      equal++;
    }
  }
}
console.log(`equal ${equal}, fallback ${fallback}, different ${different}`);
