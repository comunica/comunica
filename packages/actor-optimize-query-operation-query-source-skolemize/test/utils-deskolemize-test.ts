import { DataFactory } from 'rdf-data-factory';
import { deskolemizeTermNested, deskolemizeTermNestedThrowing } from '../lib/utils';

const DF = new DataFactory();
const inScope = DF.namedNode('urn:comunica_skolem:source_0:b1');
const outOfScope = DF.namedNode('urn:comunica_skolem:source_1:b1');

describe('deskolemizeTermNested', () => {
  it('deskolemizes a term in scope', () => {
    expect(deskolemizeTermNested(DF, inScope, '0')).toEqual(DF.blankNode('b1'));
  });

  it('returns null for a term not in scope', () => {
    expect(deskolemizeTermNested(DF, outOfScope, '0')).toBeNull();
  });

  it('deskolemizes a quoted triple in scope', () => {
    expect(deskolemizeTermNested(DF, DF.quad(inScope, DF.namedNode('p'), DF.namedNode('o')), '0'))
      .toEqual(DF.quad(DF.blankNode('b1'), DF.namedNode('p'), DF.namedNode('o')));
  });

  it('returns null for a quoted triple containing a term not in scope', () => {
    expect(deskolemizeTermNested(DF, DF.quad(inScope, DF.namedNode('p'), outOfScope), '0')).toBeNull();
  });
});

describe('deskolemizeTermNestedThrowing', () => {
  it('deskolemizes a term in scope', () => {
    expect(deskolemizeTermNestedThrowing(DF, inScope, '0')).toEqual(DF.blankNode('b1'));
  });

  it('throws for a term not in scope', () => {
    expect(() => deskolemizeTermNestedThrowing(DF, outOfScope, '0'))
      .toThrow('Skolemized term is not in scope for this source');
  });
});
