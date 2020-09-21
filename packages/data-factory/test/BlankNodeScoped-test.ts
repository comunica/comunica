import { DataFactory } from 'rdf-data-factory';
import { BlankNodeScoped } from '..';
const DF = new DataFactory();

describe('BlankNodeScoped', () => {
  describe('equals', () => {
    it('should be false for a falsy term', () => {
      return expect(new BlankNodeScoped('abc', DF.namedNode('def')).equals(null))
        .toBeFalsy();
    });

    it('should be false for a named node', () => {
      return expect(new BlankNodeScoped('abc', DF.namedNode('def')).equals(DF.namedNode('abc')))
        .toBeFalsy();
    });

    it('should be false for a blank node with another label', () => {
      return expect(new BlankNodeScoped('abc', DF.namedNode('def')).equals(DF.blankNode('ABC')))
        .toBeFalsy();
    });

    it('should be true for a blank node with the same label', () => {
      return expect(new BlankNodeScoped('abc', DF.namedNode('def')).equals(DF.blankNode('abc')))
        .toBeTruthy();
    });
  });
});
