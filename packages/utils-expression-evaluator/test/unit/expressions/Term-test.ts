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
      it('should properly express zero', () => {
        const num = new IntegerLiteral(0e0);
        expect(num.toRDF(DF).value).toBe('0');
      });

      it('should properly express one', () => {
        const num = new IntegerLiteral(1e0);
        expect(num.toRDF(DF).value).toBe('1');
      });

      it('should properly express small integer numbers', () => {
        const num = new IntegerLiteral(1.234e3);
        expect(num.toRDF(DF).value).toBe('1234');
      });

      it('should properly express large integer numbers', () => {
        const num = new IntegerLiteral(1e8);
        expect(num.toRDF(DF).value).toBe('100000000');
      });
    });

    describe('like decimals', () => {
      it('should properly express zero', () => {
        const num = new DecimalLiteral(0e0);
        expect(num.toRDF(DF).value).toBe('0.0');
      });

      it('should always include decimal point', () => {
        const num = new DecimalLiteral(1e0);
        expect(num.toRDF(DF).value).toBe('1.0');
      });

      it('should properly express small positive decimal numbers', () => {
        const num = new DecimalLiteral(1e-12);
        expect(num.toRDF(DF).value).toBe('0.000000000001');
      });

      it('should properly express large positive decimal numbers', () => {
        const num = new DecimalLiteral(100000000000.333);
        expect(num.toRDF(DF).value).toBe('100000000000.333');
      });

      it('should properly express small negative decimal numbers', () => {
        const num = new DecimalLiteral(-1e-12);
        expect(num.toRDF(DF).value).toBe('-0.000000000001');
      });

      it('should properly express large negative decimal numbers', () => {
        const num = new DecimalLiteral(-100000000000.3);
        expect(num.toRDF(DF).value).toBe('-100000000000.3');
      });
    });

    describe.each([
      [ 'doubles', (val: number) => new DoubleLiteral(val) ],
      [ 'floats', (val: number) => new FloatLiteral(val) ],
    ])('like %s', (_, createLiteral) => {
      it('should properly express NaN', () => {
        const num = createLiteral(Number.NaN);
        expect(num.toRDF(DF).value).toBe('NaN');
      });

      it('should properly express positive infinity', () => {
        const num = createLiteral(Number.POSITIVE_INFINITY);
        expect(num.toRDF(DF).value).toBe('INF');
      });

      it('should properly express negative infinity', () => {
        const num = createLiteral(Number.NEGATIVE_INFINITY);
        expect(num.toRDF(DF).value).toBe('-INF');
      });

      it('should properly express zero', () => {
        const num = createLiteral(0);
        expect(num.toRDF(DF).value).toBe('0.0E0');
      });

      it('should properly express large positive finite values', () => {
        const num = createLiteral(1100);
        expect(num.toRDF(DF).value).toBe('1.1E3');
      });

      it('should properly express small positive finite values', () => {
        const num = createLiteral(0.01);
        expect(num.toRDF(DF).value).toBe('1.0E-2');
      });

      it('should properly express large negative finite values', () => {
        const num = createLiteral(-1100);
        expect(num.toRDF(DF).value).toBe('-1.1E3');
      });

      it('should properly express small negative finite values', () => {
        const num = createLiteral(-0.01);
        expect(num.toRDF(DF).value).toBe('-1.0E-2');
      });
    });
  });
});
