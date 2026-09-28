import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { compareTerms } from '../lib/termOrder';

const DF = new DataFactory();
const RTL = DF.literal('x', { language: 'en', direction: 'rtl' });
const XSD_INTEGER = DF.namedNode('http://www.w3.org/2001/XMLSchema#integer');

describe('compareTerms', () => {
  const a = DF.namedNode('ex:a');
  const b = DF.namedNode('ex:b');

  it.each(<[string, RDF.Term, RDF.Term][]> [
    [ 'default graph before blank node', DF.defaultGraph(), DF.blankNode('a') ],
    [ 'blank node before IRI', DF.blankNode('z'), a ],
    [ 'IRI before literal', b, DF.literal('a') ],
    [ 'literal before quoted triple', DF.literal('z'), DF.quad(a, a, a) ],
    [ 'quoted triple before variable', DF.quad(a, a, a), DF.variable('a') ],
    [ 'IRIs on value', a, b ],
    [ 'numbers as strings, unlike SPARQL', DF.literal('10', XSD_INTEGER), DF.literal('9', XSD_INTEGER) ],
    [ 'literals on datatype', DF.literal('x', a), DF.literal('x', b) ],
    [ 'literals on language', DF.literal('x', 'en'), DF.literal('x', 'nl') ],
    [ 'literals on direction', DF.literal('x', { language: 'en', direction: 'ltr' }), RTL ],
    [ 'quoted triples on subject', DF.quad(a, b, b, b), DF.quad(b, a, a, a) ],
    [ 'quoted triples on predicate', DF.quad(a, a, b, b), DF.quad(a, b, a, a) ],
    [ 'quoted triples on object', DF.quad(a, a, a, b), DF.quad(a, a, b, a) ],
    [ 'quoted triples on graph', DF.quad(a, a, a, a), DF.quad(a, a, a, b) ],
  ])('orders %s', (_, smaller, larger) => {
    expect(compareTerms(smaller, larger)).toBeLessThan(0);
    expect(compareTerms(larger, smaller)).toBeGreaterThan(0);
  });

  it('compares equal terms as equal', () => {
    expect(compareTerms(a, DF.namedNode('ex:a'))).toBe(0);
    expect(compareTerms(DF.literal('x', 'en'), DF.literal('x', 'en'))).toBe(0);
    expect(compareTerms(DF.quad(a, a, DF.quad(a, a, a)), DF.quad(a, a, DF.quad(a, a, a)))).toBe(0);
  });

  it('treats a literal without a direction as one without base direction', () => {
    const withoutDirection = <RDF.Literal> <unknown> { ...DF.literal('x', 'en'), direction: undefined };
    expect(compareTerms(withoutDirection, DF.literal('x', 'en'))).toBe(0);
    expect(compareTerms(DF.literal('x', 'en'), withoutDirection)).toBe(0);
  });
});
