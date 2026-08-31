import { DataFactory } from 'rdf-data-factory';
import '../../lib';

const DF = new DataFactory();

describe('toEqualRdfTerm', () => {
  it('should succeed for equal terms', () => {
    expect(DF.namedNode('a')).toEqualRdfTerm(DF.namedNode('a'));
  });

  it('should succeed for equal blank nodes', () => {
    expect(DF.blankNode('a')).toEqualRdfTerm(DF.blankNode('a'));
  });

  it('should succeed for blank nodes with a different label', () => {
    expect(DF.blankNode('a')).toEqualRdfTerm(DF.blankNode('b'));
  });

  it('should not succeed for terms of a different type', () => {
    expect(DF.namedNode('a')).not.toEqualRdfTerm(DF.literal('a'));
  });

  it('should not succeed for named nodes with a different value', () => {
    expect(DF.namedNode('a')).not.toEqualRdfTerm(DF.namedNode('b'));
  });

  it('should fail for terms of a different type', () => {
    expect(() => expect(DF.namedNode('a')).toEqualRdfTerm(DF.literal('a')))
      .toThrow('expected a and "a" to be equal');
  });

  it('should fail for named nodes with a different value', () => {
    expect(() => expect(DF.namedNode('a')).toEqualRdfTerm(DF.namedNode('b')))
      .toThrow('expected a and b to be equal');
  });

  it('should not fail for equal terms', () => {
    expect(() => expect(DF.namedNode('a')).not.toEqualRdfTerm(DF.namedNode('a')))
      .toThrow('expected a and a not to be equal');
  });
});
