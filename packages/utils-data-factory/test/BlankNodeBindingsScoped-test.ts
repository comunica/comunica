import { DataFactory } from 'rdf-data-factory';
import { BlankNodeBindingsScoped } from '..';

const DF = new DataFactory();

describe('BlankNodeBindingsScoped', () => {
  describe('equals', () => {
    it('should be false for a falsy term', () => {
      const bn = new BlankNodeBindingsScoped('abc');
      expect(bn.equals(null)).toBeFalsy();
      expect(bn.singleBindingsScope).toBeTruthy();
    });

    it('should be false for a named node', () => {
      const bn = new BlankNodeBindingsScoped('abc');
      expect(bn.equals(DF.namedNode('abc'))).toBeFalsy();
      expect(bn.singleBindingsScope).toBeTruthy();
    });

    it('should be false for a blank node with another label', () => {
      const bn = new BlankNodeBindingsScoped('abc');
      expect(bn.equals(DF.blankNode('ABC'))).toBeFalsy();
      expect(bn.singleBindingsScope).toBeTruthy();
    });

    it('should be true for a blank node with the same label', () => {
      const bn = new BlankNodeBindingsScoped('abc');
      expect(bn.equals(DF.blankNode('abc'))).toBeTruthy();
      expect(bn.singleBindingsScope).toBeTruthy();
    });
  });
});
