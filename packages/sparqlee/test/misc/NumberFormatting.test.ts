import { DataFactory } from 'rdf-data-factory';

import * as E from '../../lib/expressions';

import { TypeURL } from './../../lib/util/Consts';

const DF = new DataFactory();

describe('the string representation of numeric literals', () => {
  describe('like integers', () => {
    it('should not have a leading +', () => {
      const num = new E.NumericLiteral(1, DF.namedNode(TypeURL.XSD_INTEGER));
      expect(num.toRDF().value).toEqual('1');
    });
  });

  describe('like decimals', () => {
    it('should not always have at least one decimal', () => {
      const num = new E.NumericLiteral(1, DF.namedNode(TypeURL.XSD_DECIMAL));
      expect(num.toRDF().value).toEqual('1');
    });
  });

  describe('like doubles', () => {
    it('should be formatted as an exponential', () => {
      const num = new E.NumericLiteral(0.1, DF.namedNode(TypeURL.XSD_DOUBLE));
      expect(num.toRDF().value).toEqual('1.0E-1');
    });

    it('should not prepend a + to the exponential', () => {
      const num = new E.NumericLiteral(10, DF.namedNode(TypeURL.XSD_DOUBLE));
      expect(num.toRDF().value).toEqual('1.0E1');
    });
  });

  describe('like floats', () => {
    it('should not be formatted as an exponential', () => {
      const num = new E.NumericLiteral(0.1, DF.namedNode(TypeURL.XSD_FLOAT));
      expect(num.toRDF().value).toEqual('0.1');
    });
  });
});
