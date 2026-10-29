import { DataFactory } from 'rdf-data-factory';
import '../../lib';

const DF = new DataFactory();

const quad = DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o'), DF.namedNode('g'));

describe('toEqualRdfQuad', () => {
  it('should succeed for equal quads', () => {
    expect(quad).toEqualRdfQuad(DF.quad(
      DF.namedNode('s'),
      DF.namedNode('p'),
      DF.namedNode('o'),
      DF.namedNode('g'),
    ));
  });

  it('should not succeed for a different subject', () => {
    expect(quad).not.toEqualRdfQuad(DF.quad(
      DF.namedNode('s2'),
      DF.namedNode('p'),
      DF.namedNode('o'),
      DF.namedNode('g'),
    ));
  });

  it('should not succeed for a different predicate', () => {
    expect(quad).not.toEqualRdfQuad(DF.quad(
      DF.namedNode('s'),
      DF.namedNode('p2'),
      DF.namedNode('o'),
      DF.namedNode('g'),
    ));
  });

  it('should not succeed for a different object', () => {
    expect(quad).not.toEqualRdfQuad(DF.quad(
      DF.namedNode('s'),
      DF.namedNode('p'),
      DF.namedNode('o2'),
      DF.namedNode('g'),
    ));
  });

  it('should not succeed for a different graph', () => {
    expect(quad).not.toEqualRdfQuad(DF.quad(
      DF.namedNode('s'),
      DF.namedNode('p'),
      DF.namedNode('o'),
      DF.namedNode('g2'),
    ));
  });

  it('should fail for a different object', () => {
    expect(() => expect(quad).toEqualRdfQuad(DF.quad(
      DF.namedNode('s'),
      DF.namedNode('p'),
      DF.namedNode('o2'),
      DF.namedNode('g'),
    ))).toThrow('expected o and o2 to be equal');
  });

  it('should not fail for equal quads', () => {
    expect(() => expect(quad).not.toEqualRdfQuad(DF.quad(
      DF.namedNode('s'),
      DF.namedNode('p'),
      DF.namedNode('o'),
      DF.namedNode('g'),
    ))).toThrow('not to equal');
  });
});
