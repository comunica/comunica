import { getMockSuperTypeProvider } from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { TermTransformer, TypeURL } from '../../../lib';
import { bool, error, merge, numeric, str } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import type { ITestTableConfigBase } from '../../util/utils';
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

  describe('raw literals tests', () => {
    const booleanType = DF.namedNode(TypeURL.XSD_BOOLEAN);
    const integerType = DF.namedNode(TypeURL.XSD_INTEGER);
    const stringType = DF.namedNode(TypeURL.XSD_STRING);
    const doubleType = DF.namedNode(TypeURL.XSD_DOUBLE);
    const unsignedIntType = DF.namedNode(TypeURL.XSD_UNSIGNED_INT);
    const floatType = DF.namedNode(TypeURL.XSD_FLOAT);

    testCoercesTo('non lexical', booleanType, false);
    testCoercesTo('non lexical', integerType, false);

    testCoercesTo('true', booleanType, true);
    testCoercesTo('false', booleanType, false);

    testLiteralCoercesTo(DF.literal(''), false);
    testLiteralCoercesTo(DF.literal('', 'en'), false);
    testCoercesTo('', stringType, false);

    testLiteralCoercesTo(DF.literal('a'), true);
    testLiteralCoercesTo(DF.literal('a', 'en'), true);
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

  // TODO: Can be removed in final version of this PR!
  //  These tests are dublicates f the once above (I think), i keep them here in case I need tests for 100% coverage)
  // eslint-disable-next-line jest/no-disabled-tests
  describe.skip('using \'!\' like', () => {
    const baseConfig: ITestTableConfigBase = {
      arity: 1,
      operation: '!',
      aliases: merge(numeric, bool, error, str),
      notation: Notation.Prefix,
    };
    // We use these tests to test the evaluation of EBV: https://www.w3.org/TR/sparql11-query/#ebv
    runTestTable({
      ...baseConfig,
      testTable: `
      true = false
      false = true
      
      0i = true
      NaN = true
      1i = false
      '-5i' = false
      
      empty = true
      '""' = true
      aaa = false
      'aaa' = false
      
      invalidBool = true
      invalidInt = true
      invalidShort = true
    `,
    });
  });
});
