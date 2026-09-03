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
      it('should property format zero', () => {
        const num = new DecimalLiteral(0);
        expect(num.toRDF(DF).value).toBe('0');
      });

      it('should property format small integer numbers', () => {
        const num = new DecimalLiteral(1234);
        expect(num.toRDF(DF).value).toBe('1234');
      });

      it('should property format large integer numbers', () => {
        const num = new DecimalLiteral(100000000);
        expect(num.toRDF(DF).value).toBe('100000000');
      });
    });

    describe('like decimals', () => {
      it('should property format zero', () => {
        const num = new DecimalLiteral(0);
        expect(num.toRDF(DF).value).toBe('0');
      });

      it('should not add decimal places to integer values', () => {
        const num = new DecimalLiteral(1);
        expect(num.toRDF(DF).value).toBe('1');
      });

      it('should properly format small positive decimal numbers', () => {
        const num = new DecimalLiteral(1.23456789);
        expect(num.toRDF(DF).value).toBe('1.23456789');
      });

      it('should properly format large positive decimal numbers', () => {
        const num = new DecimalLiteral(100000000000.3);
        expect(num.toRDF(DF).value).toBe('100000000000.3');
      });

      it('should properly format small negative decimal numbers', () => {
        const num = new DecimalLiteral(-1.23456789);
        expect(num.toRDF(DF).value).toBe('-1.23456789');
      });

      it('should properly format large negative decimal numbers', () => {
        const num = new DecimalLiteral(-100000000000.3);
        expect(num.toRDF(DF).value).toBe('-100000000000.3');
      });
    });

    describe.each([
      [ 'doubles', (val: number) => new DoubleLiteral(val) ],
      [ 'floats', (val: number) => new FloatLiteral(val) ],
    ])('like %s', (_, createLiteral) => {
      it('should properly format NaN', () => {
        const num = createLiteral(Number.NaN);
        expect(num.toRDF(DF).value).toBe('NaN');
      });

      it('should properly format positive infinity', () => {
        const num = createLiteral(Number.POSITIVE_INFINITY);
        expect(num.toRDF(DF).value).toBe('INF');
      });

      it('should properly format negative infinity', () => {
        const num = createLiteral(Number.NEGATIVE_INFINITY);
        expect(num.toRDF(DF).value).toBe('-INF');
      });

      it('should properly format zero', () => {
        const num = createLiteral(0);
        expect(num.toRDF(DF).value).toBe('0.0E0');
      });

      it('should properly format large positive finite values', () => {
        const num = createLiteral(1100);
        expect(num.toRDF(DF).value).toBe('1.1E3');
      });

      it('should properly format small positive finite values', () => {
        const num = createLiteral(0.01);
        expect(num.toRDF(DF).value).toBe('1.0E-2');
      });

      it('should properly format large negative finite values', () => {
        const num = createLiteral(-1100);
        expect(num.toRDF(DF).value).toBe('-1.1E3');
      });

      it('should properly format small negative finite values', () => {
        const num = createLiteral(-0.01);
        expect(num.toRDF(DF).value).toBe('-1.0E-2');
      });
    });
  });
});
