import type { ISuperTypeProvider } from '@comunica/types';
import { getMockSuperTypeProvider } from '@comunica/utils-jest';
import { DataFactory } from 'rdf-data-factory';
import {
  TypeURL,
  DoubleLiteral,
  FloatLiteral,
  IntegerLiteral,
  isNonLexicalLiteral,
  NonLexicalLiteral,
  DecimalLiteral,
} from '../../../lib';

const DF = new DataFactory();

describe('Term', () => {
  describe('has isNonLexicalLiteral function', () => {
    it('detects nonLexicalLiterals', () => {
      const superTypeProvider: ISuperTypeProvider = getMockSuperTypeProvider();
      expect(isNonLexicalLiteral(new NonLexicalLiteral(undefined, TypeURL.XSD_DECIMAL, superTypeProvider, '1')))
        .toBeTruthy();
    });

    it('detects when literal is not NonLexicalLiteral', () => {
      expect(isNonLexicalLiteral(new IntegerLiteral(1)))
        .toBeFalsy();
    });
  });

  describe('the string representation of numeric literals', () => {
    describe('like integers', () => {
      it('should not have a leading +', () => {
        const num = new IntegerLiteral(1);
        expect(num.toRDF(DF).value).toBe('1');
      });
    });

    describe('like decimals', () => {
      it('should not always have at least one decimal', () => {
        const num = new DecimalLiteral(1);
        expect(num.toRDF(DF).value).toBe('1');
      });
    });

    describe('like doubles', () => {
      it('should be formatted as an exponential', () => {
        const num = new DoubleLiteral(0.1);
        expect(num.toRDF(DF).value).toBe('1.0E-1');
      });

      it('should not prepend a + to the exponential', () => {
        const num = new DoubleLiteral(10);
        expect(num.toRDF(DF).value).toBe('1.0E1');
      });
    });

    describe('like floats', () => {
      it('should not be formatted as an exponential', () => {
        const num = new FloatLiteral(0.1);
        expect(num.toRDF(DF).value).toBe('0.1');
      });
    });
  });
});
