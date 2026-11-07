import { toAlgebra } from '@traqula/algebra-sparql-1-2';
import { Parser } from '@traqula/parser-sparql-1-2';
import { AstFactory } from '@traqula/rules-sparql-1-2';
import { DataFactory } from 'rdf-data-factory';
import { FastParserFallbackError, FastSparqlParser } from '../lib/FastSparqlParser';

const DF = new DataFactory();
const prefixes = Object.freeze({
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  foaf: 'http://xmlns.com/foaf/0.1/',
});
const traqula = new Parser();

function parseRegular(query: string): unknown {
  const ast = traqula.parse(query, { prefixes, astFactory: new AstFactory() });
  return toAlgebra(ast, { quads: true, prefixes, blankToVariable: true, dataFactory: DF });
}

function parseFast(query: string, defaultPrefixes: Record<string, string> | undefined = prefixes): unknown {
  return new FastSparqlParser(DF).parse(query, defaultPrefixes);
}

describe('FastSparqlParser', () => {
  // Queries that the fast parser supports, for which it must produce the same algebra as the regular parser
  it.each([
    // Projection, modifiers, and the query form
    'SELECT ?s WHERE { ?s ?p ?o }',
    'SELECT ?s { ?s ?p ?o }',
    'select distinct ?s ?o where { ?s ?p ?o }',
    'SELECT $s WHERE { $s ?p ?o }',
    'SELECT ?s ?unused WHERE { ?s ?p ?o }',
    'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10',
    'SELECT ?s WHERE { ?s ?p ?o } OFFSET 5',
    'SELECT ?s WHERE { ?s ?p ?o } OFFSET 0',
    'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10 OFFSET 5',
    'SELECT ?s WHERE { ?s ?p ?o } OFFSET 5 LIMIT 10',
    'SELECT ?s WHERE { ?s ?p ?o } LIMIT 0',
    'SELECT ?s WHERE { ?s ?p ?o } ORDER BY ?s',
    'SELECT ?s WHERE { ?s ?p ?o } ORDER BY ?s ?o LIMIT 1',
    'SELECT ?s WHERE { ?s ?p ?o } ORDER BY ASC(?s) DESC(?o)',
    'SELECT ?s WHERE { ?s ?p ?o } ORDER BY (?o + 1)',
    'SELECT ?s WHERE { ?s ?p ?o } ORDER BY STR(?o)',
    'SELECT DISTINCT ?s WHERE { ?s ?p ?o } ORDER BY DESC(?s) LIMIT 5 OFFSET 2',
    // Prefixes
    'PREFIX ex: <http://ex.org/> SELECT ?s WHERE { ?s ex:p ex:o }',
    'PREFIX : <http://ex.org/> SELECT ?s WHERE { ?s :p : }',
    'PREFIX foaf: <http://other.org/> SELECT ?s WHERE { ?s foaf:name ?o }',
    'SELECT ?s WHERE { ?s foaf:a.b foaf:1, foaf:a:b, foaf:_x, foaf:a-b, foaf: }',
    // Comments and whitespace
    '# A comment\nSELECT ?s\tWHERE {\r\n  ?s ?p ?o # another comment\n}',
    // Triples
    'SELECT ?s WHERE { ?s ?p ?o . }',
    'SELECT ?s WHERE { ?s ?p ?o . ?o ?p2 ?o2 }',
    'SELECT ?s WHERE { ?s ?p ?o ; ?p2 ?o2 ; }',
    'SELECT ?s WHERE { ?s ?p ?o ;; ?p2 ?o2 . }',
    'SELECT ?s WHERE { ?s ?p ?o , ?o2 , ?o3 }',
    'SELECT ?s WHERE { ?s a foaf:Person }',
    'SELECT ?s WHERE { <http://ex.org/s> <http://ex.org/p> ?s }',
    'SELECT ?s WHERE { ?s ?p <a1+b.c-d:x> }',
    // Literals
    'SELECT ?s WHERE { ?s ?p "abc" }',
    'SELECT ?s WHERE { ?s ?p \'abc\' }',
    'SELECT ?s WHERE { ?s ?p "a\\"b\\\\c\\td\\ne\\rf\\bg\\fh\\\'i" }',
    'SELECT ?s WHERE { ?s ?p "abc"@en }',
    'SELECT ?s WHERE { ?s ?p "abc"@en-us }',
    'SELECT ?s WHERE { ?s ?p "abc"^^xsd:string }',
    'SELECT ?s WHERE { ?s ?p "abc"^^<http://ex.org/dt> }',
    'SELECT ?s WHERE { ?s ?p 42 }',
    'SELECT ?s WHERE { ?s ?p 4.2 }',
    'SELECT ?s WHERE { ?s ?p 1e3 }',
    'SELECT ?s WHERE { ?s ?p 1.5E-2 }',
    'SELECT ?s WHERE { ?s ?p 1.e5 }',
    'SELECT ?s WHERE { ?s ?p 5. }',
    'SELECT ?s WHERE { ?s ?p 5.}',
    'SELECT ?s WHERE { ?s ?p -3 }',
    'SELECT ?s WHERE { ?s ?p true ; ?p2 false }',
    // Property paths
    'SELECT ?s WHERE { ?s foaf:knows/foaf:name ?o }',
    'SELECT ?s WHERE { ?s foaf:knows/foaf:knows/foaf:name ?o }',
    'SELECT ?var0 WHERE { ?var0 foaf:knows/foaf:name ?var1 }',
    'SELECT ?s WHERE { ?s ^foaf:knows ?o }',
    'SELECT ?s WHERE { ?s ^foaf:knows/foaf:name ?o }',
    'SELECT ?s WHERE { ?s foaf:knows|foaf:name ?o }',
    'SELECT ?s WHERE { ?s foaf:knows* ?o }',
    'SELECT ?s WHERE { ?s foaf:knows+ ?o }',
    'SELECT ?s WHERE { ?s foaf:knows? ?o }',
    'SELECT ?s WHERE { ?s (foaf:knows) ?o }',
    'SELECT ?s WHERE { ?s (foaf:knows/^foaf:name)+ ?o }',
    'SELECT ?s WHERE { ?s ?p ?o . ?s foaf:knows+ ?x . ?x ?p ?y }',
    'SELECT ?s WHERE { ?s foaf:knows+ ?x ; ?p ?y . ?y foaf:knows* ?z }',
    'SELECT ?s WHERE { ?s a/foaf:name ?o }',
    // Groups
    'SELECT ?s WHERE { { ?s ?p ?o } }',
    'SELECT ?s WHERE { ?s ?p ?o { ?o ?p2 ?o2 } }',
    'SELECT ?s WHERE { { ?s ?p ?o } ?o ?p2 ?o2 }',
    'SELECT ?s WHERE { {} ?s ?p ?o }',
    'SELECT ?s WHERE { ?s ?p ?o {} }',
    'SELECT ?s WHERE { { ?s ?p ?o } UNION { ?s ?p2 ?o } }',
    'SELECT ?s WHERE { ?s ?p ?o . { ?s ?p ?o } UNION { ?s ?p2 ?o } UNION { ?s ?p3 ?o } . ?o ?p ?x }',
    'SELECT ?s WHERE { ?s ?p ?o OPTIONAL { ?o ?p2 ?o2 } }',
    'SELECT ?s WHERE { ?s ?p ?o OPTIONAL { ?o ?p2 ?o2 } {} }',
    'SELECT ?s WHERE { ?s ?p ?o OPTIONAL { ?o ?p2 ?o2 FILTER(?o2 > 3) } }',
    'SELECT ?s WHERE { ?s ?p ?o OPTIONAL { ?o ?p2 ?o2 { ?o2 ?p3 ?o3 FILTER(?o3) } } }',
    'SELECT ?s WHERE { ?s ?p ?o OPTIONAL { ?o ?p2 ?o2 OPTIONAL { ?o2 ?p3 ?o3 } } }',
    'SELECT ?s WHERE { ?s ?p ?o OPTIONAL { ?o ?p2 ?o2 FILTER(STR(?o2) = "a") FILTER(?o2) } }',
    'SELECT ?s WHERE { ?s ?p ?o . BIND(STR(?o) AS ?str) }',
    'SELECT ?s WHERE { ?s ?p ?o . BIND(?o AS ?x) . ?x ?p ?y }',
    // Filters
    'SELECT ?s WHERE { ?s ?p ?o FILTER(?o = 1) }',
    'SELECT ?s WHERE { FILTER(?o = 1) ?s ?p ?o }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(?o = 1) FILTER(?o != 2) FILTER(?o < 3) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER STRSTARTS(STR(?o), "http") }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER <http://ex.org/f>(?o) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER foaf:f(?o, 1) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(foaf:f()) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(?o > 1 && ?o < 2 || ?o >= 3 && ?o <= 4) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(?o + 1 - 2 * 3 / 4 > 0) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(?o - -1 > 0) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(!BOUND(?o)) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(!(?o)) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(-?o < 0) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(-(?o) < 0) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(?o IN (1, 2, "a")) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(?o NOT IN (1)) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(?o IN ()) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(?o = foaf:x) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(?o = true) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(LANGMATCHES(LANG(?o), "en")) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(REGEX(?o, "a") || REGEX(?o, "a", "i")) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(CONCAT() = CONCAT(?o, ?o, ?o)) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(COALESCE(?o, 1) = IF(?o, 1, 2)) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(RAND() < NOW()) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(SUBSTR(?o, 1) = SUBSTR(?o, 1, 2)) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(REPLACE(?o, "a", "b") = REPLACE(?o, "a", "b", "i")) }',
    'SELECT ?s WHERE { ?s ?p ?o FILTER(isIRI(?o) && isUri(?o) && sameTerm(?o, ?s)) }',
  ])('should parse %s like the regular parser', (query) => {
    expect(parseFast(query)).toEqual(parseRegular(query));
  });

  // Queries that the fast parser does not support, including invalid ones, for which it must fall back
  it.each([
    [ 'SELECT * WHERE { ?s ?p ?o }', 'Unsupported projection' ],
    [ 'SELECT (?s AS ?x) WHERE { ?s ?p ?o }', 'Unsupported projection' ],
    [ 'SELECT ?s ?s WHERE { ?s ?p ?o }', 'Duplicate projected variable' ],
    [ 'ASK { ?s ?p ?o }', 'Expected SELECT' ],
    [ 'BASE <http://ex.org/> SELECT ?s WHERE { ?s ?p ?o }', 'Expected SELECT' ],
    [ 'PREFIX ex <http://ex.org/> SELECT ?s WHERE { ?s ?p ?o }', 'Invalid prefix' ],
    [ 'PREFIX ex:a <http://ex.org/> SELECT ?s WHERE { ?s ?p ?o }', 'Invalid prefix' ],
    [ 'PREFIX ex: "x" SELECT ?s WHERE { ?s ?p ?o }', 'Invalid prefix' ],
    [ 'PREFIX ex: <relative> SELECT ?s WHERE { ?s ?p ?o }', 'Relative IRIs' ],
    [ 'SELECT ?s WHERE { ?s ?p <relative> }', 'Relative IRIs' ],
    [ 'SELECT ?s WHERE { ?s ?p <> }', 'Relative IRIs' ],
    [ 'SELECT ?s WHERE { ?s ?p <1abc:x> }', 'Relative IRIs' ],
    [ 'SELECT ?s WHERE { ?s ?p <a/b:c> }', 'Relative IRIs' ],
    [ 'SELECT ?s WHERE { ?s ?p <a_b:c> }', 'Relative IRIs' ],
    [ 'SELECT ?s WHERE { ?s ?p unknown:x }', 'Unknown prefix' ],
    [ 'SELECT ?s WHERE { ?s ?p constructor:x }', 'Unknown prefix' ],
    [ 'SELECT ?s WHERE { ?s ?p foaf:a\\.b }', 'Escaped local names' ],
    [ 'SELECT ?s WHERE { ?s ?p foaf:a%20b }', 'Escaped local names' ],
    [ 'SELECT ?s WHERE { ?s ?p foaf:-a }', 'Invalid local name' ],
    [ 'SELECT ?s WHERE { ?s ?p << ?a ?b ?c >> }', 'Triple terms' ],
    [ 'SELECT ?s WHERE { ?s ?p $ }', 'Unexpected $' ],
    [ 'SELECT ?s WHERE { ?s ?p ? }', 'Unsupported term' ],
    [ 'SELECT ?s WHERE { ?s ?p """long""" }', 'Long strings' ],
    [ 'SELECT ?s WHERE { ?s ?p "abc }', 'Unterminated string' ],
    [ 'SELECT ?s WHERE { ?s ?p "a\nb" }', 'Unterminated string' ],
    [ 'SELECT ?s WHERE { ?s ?p "a\\u0041" }', 'Unsupported escape' ],
    [ 'SELECT ?s WHERE { ?s ?p "a"@EN }', 'Unsupported language tag' ],
    [ 'SELECT ?s WHERE { ?s ?p "a"@ }', 'Unsupported language tag' ],
    [ 'SELECT ?s WHERE { ?s ?p .5 }', 'Numbers starting with a dot' ],
    [ 'SELECT ?s WHERE { ?s ?p +5 }', 'Unsupported term' ],
    [ 'SELECT ?s WHERE { ?s ?p ~ }', 'Unsupported character ~' ],
    [ 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1.5', 'Expected integer' ],
    [ 'SELECT ?s WHERE { ?s ?p ?o } LIMIT ?x', 'Expected integer' ],
    [ 'SELECT ?s WHERE { ?s ?p ?o } ORDER BY', 'Empty ORDER BY' ],
    [ 'SELECT ?s WHERE { ?s ?p ?o } ORDER ?s', 'Expected BY' ],
    [ 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1 LIMIT 2', 'Unsupported trailing input' ],
    [ 'SELECT ?s WHERE { ?s ?p ?o } GROUP BY ?s', 'Unsupported trailing input' ],
    [ 'SELECT ?s WHERE { SELECT ?s WHERE { ?s ?p ?o } }', 'Subqueries' ],
    [ 'SELECT ?s WHERE ?s', 'Expected {' ],
    [ 'SELECT ?s WHERE { GRAPH ?g { ?s ?p ?o } }', 'Unsupported keyword GRAPH' ],
    [ 'SELECT ?s WHERE { ?s ?p ?o MINUS { ?s ?p ?o } }', 'Unsupported keyword MINUS' ],
    [ 'SELECT ?s WHERE { a ?p ?o }', 'Unsupported term' ],
    [ 'SELECT ?s WHERE { "s" ?p ?o }', 'Unsupported term' ],
    [ 'SELECT ?s WHERE { ?s ?p ?o ?s ?p ?o }', 'Expected .' ],
    [ 'SELECT ?s WHERE { ?s ?p ?o . BIND(1 AS ?o) }', 'BIND to an in-scope variable' ],
    [ 'SELECT ?s WHERE { BIND(1 AS "x") }', 'Expected variable' ],
    [ 'SELECT ?s WHERE { BIND(1 ?x) }', 'Expected AS' ],
    [ 'SELECT ?s WHERE { ?s A ?o }', 'Unsupported path' ],
    [ 'SELECT ?s WHERE { ?s "p" ?o }', 'Unsupported path' ],
    [ 'SELECT ?s WHERE { ?s !foaf:p ?o }', 'Unsupported path' ],
    [ 'SELECT ?s WHERE { ?s (foaf:p ?o }', 'Expected )' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER ?o }', 'Unsupported constraint' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER(EXISTS { ?s ?p ?o }) }', 'Unsupported expression at EXISTS' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER(?o + +1) }', 'Unary plus or positive numbers' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER(?o +1) }', 'Signed numbers in additive expressions' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER(?o -1) }', 'Signed numbers in additive expressions' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER(+?o) }', 'Unary plus or positive numbers' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER(STR()) }', 'Invalid arguments for str' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER(STR(?o, ?o)) }', 'Invalid arguments for str' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER(BOUND("x")) }', 'Invalid arguments for bound' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER(BOUND(STR(?o))) }', 'Invalid arguments for bound' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER(foaf:f(DISTINCT ?o)) }', 'DISTINCT in function call' ],
    [ 'SELECT ?s WHERE { ?s foaf:p ?o FILTER(?o = ) }', 'Unsupported expression at )' ],
    [ 'SELECT ?s WHERE { ?s ?p ?o OPTIONAL {', 'Unsupported term' ],
    [ 'SELECT ?s WHERE { ?s ?p "a"^^?x }', 'Expected IRI' ],
  ])('should fall back for %s', (query, message) => {
    expect(() => parseFast(query)).toThrow(new FastParserFallbackError(message));
  });

  it('should fall back for relative default prefixes', () => {
    expect(() => parseFast('SELECT ?s WHERE { ?s ?p ?o }', { ex: 'relative' }))
      .toThrow(new FastParserFallbackError('Relative default prefixes'));
  });

  it('should parse without default prefixes', () => {
    expect(parseFast('SELECT ?s WHERE { ?s ?p ?o }', undefined)).toEqual(parseRegular('SELECT ?s WHERE { ?s ?p ?o }'));
  });

  it('should reuse a parser for several queries', () => {
    const parser = new FastSparqlParser(DF);
    for (const query of [ 'SELECT ?s WHERE { ?s ?p ?o }', 'SELECT ?o WHERE { ?s foaf:knows/foaf:name ?o }' ]) {
      expect(parser.parse(query, prefixes)).toEqual(parseRegular(query));
    }
  });
});
