import { getMockSuperTypeProvider } from '@comunica/utils-expression-evaluator/test/util/helpers';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { TermTransformer, TypeURL } from '../../../lib';
import { bool } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

const DF = new DataFactory();

// https://www.w3.org/TR/sparql11-query/#ebv
// Using && as utility to force EBV
describe('the coercion of RDF terms to it\'s EBV like', () => {
  const superTypeProvider = getMockSuperTypeProvider();
  const transformer = new TermTransformer(superTypeProvider);

  function testCoercesTo(someVaridk: string, type: RDF.NamedNode, value: boolean) {
    it(`should coerce ${someVaridk}^^${type.value} to ${value}`, () => {
      expect(transformer.transformLiteral(DF.literal(someVaridk, type)).coerceEBV()).toEqual(value);
    });
  }

  function testLiteralCoercesTo(someVaridk: RDF.Literal, value: boolean) {
    it(`should coerce ${someVaridk.value}@"${someVaridk.language}"^^${someVaridk.datatype.value} to ${value}`, () => {
      expect(transformer.transformLiteral(someVaridk).coerceEBV()).toEqual(value);
    });
  }

  function testCannotCoerce(someVaridk: string, type: RDF.NamedNode) {
    it(`should not coerce ${someVaridk}^^${type.value}`, () => {
      expect(() => transformer.transformLiteral(DF.literal(someVaridk, type)).coerceEBV())
        .toThrow('Cannot coerce term to EBV');
    });
  }

  function testLiteralCannotCoerce(someVaridk: RDF.Literal) {
    it(`should not coerce ${someVaridk.value}@"${someVaridk.language}"^^${someVaridk.datatype.value}`, () => {
      expect(() => transformer.transformLiteral(someVaridk).coerceEBV())
        .toThrow('Cannot coerce term to EBV');
    });
  }

  describe('raw literals tests', () => {
    const booleanType = DF.namedNode(TypeURL.XSD_BOOLEAN);
    const integerType = DF.namedNode(TypeURL.XSD_INTEGER);
    const stringType = DF.namedNode(TypeURL.XSD_STRING);
    const doubleType = DF.namedNode(TypeURL.XSD_DOUBLE);
    const unsignedIntType = DF.namedNode(TypeURL.XSD_UNSIGNED_INT);
    const floatType = DF.namedNode(TypeURL.XSD_FLOAT);

    testCannotCoerce('non lexical', booleanType);
    testCannotCoerce('non lexical', integerType);

    testCoercesTo('true', booleanType, true);
    testCoercesTo('false', booleanType, false);

    testLiteralCoercesTo(DF.literal(''), false);
    testLiteralCannotCoerce(DF.literal('', 'en'));
    testLiteralCannotCoerce(DF.literal('', { language: 'en', direction: 'ltr' }));
    testCoercesTo('', stringType, false);

    testLiteralCoercesTo(DF.literal('a'), true);
    testLiteralCannotCoerce(DF.literal('a', 'en'));
    testLiteralCannotCoerce(DF.literal('a', { language: 'en', direction: 'ltr' }));
    testCoercesTo('a', stringType, true);

    testCoercesTo('0', integerType, false);
    testCoercesTo('0.0', doubleType, false);
    testCoercesTo('0', unsignedIntType, false);
    testCoercesTo('NaN', floatType, false);

    testCoercesTo('3', integerType, true);
    testCoercesTo('0.01667', doubleType, true);
    testCoercesTo('1', unsignedIntType, true);
    testCoercesTo('INF', floatType, true);
    testCoercesTo('-INF', floatType, true);

    testCannotCoerce('2001-10-26T21:32:52+02:00', DF.namedNode(TypeURL.XSD_DATE_TIME));
    testCannotCoerce('not a dateTime', DF.namedNode(TypeURL.XSD_DATE_TIME));
  });

  describe('using \'&&\' like', () => {
    runTestTable({
      arity: 2,
      notation: Notation.Infix,
      operation: '&&',
      aliases: bool,
      errorTable: `
        ?a true = ''
        <http://example.com> true = ''
     `,
    });
  });
});
