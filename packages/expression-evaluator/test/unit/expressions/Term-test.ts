import { IntegerLiteral, isNonLexicalLiteral, NonLexicalLiteral } from '../../../lib/expressions';
import * as E from '../../../lib/expressions';
import { TypeURL } from '../../../lib/util/Consts';
import type { ISuperTypeProvider } from '../../../lib/util/TypeHandling';
import { getDefaultSharedContext } from '../../util/utils';

describe('Term', () => {
  describe('has isNonLexicalLiteral function', () => {
    it('detects nonLexicalLiterals', () => {
      const openWorldType: ISuperTypeProvider = getDefaultSharedContext().superTypeProvider;
      expect(isNonLexicalLiteral(new NonLexicalLiteral(undefined, TypeURL.XSD_DECIMAL, openWorldType, '1')))
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
        const num = new E.IntegerLiteral(1);
        expect(num.toRDF().value).toEqual('1');
      });
    });

    describe('like decimals', () => {
      it('should not always have at least one decimal', () => {
        const num = new E.DecimalLiteral(1);
        expect(num.toRDF().value).toEqual('1');
      });
    });

    describe('like doubles', () => {
      it('should be formatted as an exponential', () => {
        const num = new E.DoubleLiteral(0.1);
        expect(num.toRDF().value).toEqual('1.0E-1');
      });

      it('should not prepend a + to the exponential', () => {
        const num = new E.DoubleLiteral(10);
        expect(num.toRDF().value).toEqual('1.0E1');
      });
    });

    describe('like floats', () => {
      it('should not be formatted as an exponential', () => {
        const num = new E.FloatLiteral(0.1);
        expect(num.toRDF().value).toEqual('0.1');
      });
    });
  });
});
