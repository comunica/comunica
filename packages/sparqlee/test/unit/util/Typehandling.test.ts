import type { ArgumentType } from '../../../lib/functions';
import type { KnownLiteralTypes } from '../../../lib/util/Consts';
import { TypeAlias, TypeURL } from '../../../lib/util/Consts';
import type { OverrideType } from '../../../lib/util/TypeHandling';
import {
  asKnownLiteralType,
  asOverrideType,
  asTypeAlias,
  isInternalSubType,
  isSubTypeOf,
  mainSparqlType,
} from '../../../lib/util/TypeHandling';
import { getDefaultSharedContext } from '../../util/utils';

describe('TypeHandling', () => {
  describe('has isTypeAlias function', () => {
    it('can say yes', () => {
      expect(
        [ TypeAlias.SPARQL_NON_LEXICAL, TypeAlias.SPARQL_NUMERIC, TypeAlias.SPARQL_STRINGLY ]
          .every(type => asTypeAlias(type)),
      ).toBeTruthy();
    });
    it('can say no', () => {
      expect(
        [
          '', 'apple', 'not a literal type', 'pear', 'term', TypeURL.XSD_INTEGER, TypeURL.XSD_DECIMAL,
          TypeURL.XSD_BOOLEAN, TypeURL.XSD_DATE_TIME, TypeURL.XSD_DOUBLE, TypeURL.XSD_STRING,
        ].every(type => !asTypeAlias(type)),
      ).toBeTruthy();
    });
  });
  describe('has isLiteralType function', () => {
    it('can say yes', () => {
      expect([ TypeURL.XSD_DECIMAL, TypeURL.XSD_DOUBLE, TypeURL.XSD_YEAR_MONTH_DURATION, TypeURL.RDF_LANG_STRING,
        TypeAlias.SPARQL_NUMERIC, TypeAlias.SPARQL_NON_LEXICAL, TypeAlias.SPARQL_NON_LEXICAL ]
        .every(type => asKnownLiteralType(type))).toBeTruthy();
    });
    it('can say no', () => {
      [ '', 'apple', 'not a literal type', 'pear', 'term' ].every(type => !asKnownLiteralType(type));
    });
  });
  describe('has isOverrideType function', () => {
    it('can say yes', () => {
      expect([ TypeURL.XSD_DECIMAL, TypeURL.XSD_DOUBLE, TypeURL.XSD_YEAR_MONTH_DURATION, TypeURL.RDF_LANG_STRING,
        TypeAlias.SPARQL_NUMERIC, TypeAlias.SPARQL_NON_LEXICAL, TypeAlias.SPARQL_NON_LEXICAL, 'term' ]
        .every(type => asOverrideType(type))).toBeTruthy();
    });
    it('can say no', () => {
      expect([ '', 'apple', 'not a literal type', 'pear' ].every(type => !asOverrideType(type))).toBeTruthy();
    });
  });

  describe('has internalIsSubType function', () => {
    it('can say yes', () => {
      const testArray: [OverrideType, KnownLiteralTypes][] = [
        [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ], [ TypeURL.XSD_SHORT, TypeURL.XSD_INT ],
      ];
      expect(testArray.every(([ baseType, argumentType ]) => isInternalSubType(baseType, argumentType))).toBeTruthy();
    });
    it('can say no', () => {
      const testArray: [OverrideType, KnownLiteralTypes][] = [
        [ 'term', TypeAlias.SPARQL_NON_LEXICAL ], [ 'term', TypeURL.XSD_STRING ],
        [ TypeURL.XSD_BOOLEAN, TypeURL.XSD_DOUBLE ], [ TypeURL.XSD_FLOAT, TypeURL.XSD_DOUBLE ],
      ];
      expect(testArray.every(([ baseType, argumentType ]) => !isInternalSubType(baseType, argumentType))).toBeTruthy();
    });
  });

  describe('has isSubTypeOf function', () => {
    it('can say yes', () => {
      const testArray: [OverrideType, KnownLiteralTypes][] = [
        [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ], [ TypeURL.XSD_SHORT, TypeURL.XSD_INT ],
      ];
      expect(testArray.every(([ baseType, argumentType ]) =>
        isSubTypeOf(baseType, argumentType, getDefaultSharedContext().superTypeProvider))).toBeTruthy();
    });
    it('can say no', () => {
      const testArray: [OverrideType, KnownLiteralTypes][] = [
        [ 'term', TypeAlias.SPARQL_NON_LEXICAL ], [ 'term', TypeURL.XSD_STRING ],
        [ TypeURL.XSD_BOOLEAN, TypeURL.XSD_DOUBLE ], [ TypeURL.XSD_FLOAT, TypeURL.XSD_DOUBLE ],
      ];
      expect(testArray.every(([ baseType, argumentType ]) =>
        !isSubTypeOf(baseType, argumentType, getDefaultSharedContext().superTypeProvider))).toBeTruthy();
    });
  });

  describe('has mainSparqlType function', () => {
    it('returns the correct type', () => {
      const testArray: [string, ArgumentType[]][] = [
        [ 'term', [ 'term' ]],
        [ 'namedNode', [ 'namedNode' ]],
        [ 'blankNode', [ 'blankNode' ]],
        [ 'literal', [ 'literal' ]],
        [ TypeAlias.SPARQL_NON_LEXICAL, [ 'nonlexical' ]],
        [ '', [ 'string' ]],
        [ TypeURL.XSD_ANY_URI, [ 'string' ]],
        [ TypeURL.XSD_NORMALIZED_STRING, [ 'string' ]],
        [ TypeURL.XSD_TOKEN, [ 'string' ]],
        [ TypeURL.XSD_LANGUAGE, [ 'string' ]],
        [ TypeURL.XSD_NM_TOKEN, [ 'string' ]],
        [ TypeURL.XSD_NAME, [ 'string' ]],
        [ TypeURL.XSD_ENTITY, [ 'string' ]],
        [ TypeURL.XSD_ID, [ 'string' ]],
        [ TypeURL.XSD_ID_REF, [ 'string' ]],
        [ TypeURL.XSD_STRING, [ 'string' ]],
        [ TypeURL.RDF_LANG_STRING, [ 'langString' ]],
        [ TypeURL.XSD_DATE_TIME_STAMP, [ 'dateTime' ]],
        [ TypeURL.XSD_DATE_TIME, [ 'dateTime' ]],
        [ TypeURL.XSD_BOOLEAN, [ 'boolean' ]],
        [ TypeURL.XSD_DECIMAL, [ 'decimal', 'integer' ]],
        [ TypeURL.XSD_FLOAT, [ 'float' ]],
        [ TypeURL.XSD_DOUBLE, [ 'double' ]],
        [ TypeURL.XSD_NON_POSITIVE_INTEGER, [ 'integer' ]],
        [ TypeURL.XSD_NEGATIVE_INTEGER, [ 'integer' ]],
        [ TypeURL.XSD_LONG, [ 'integer' ]],
        [ TypeURL.XSD_INT, [ 'integer' ]],
        [ TypeURL.XSD_SHORT, [ 'integer' ]],
        [ TypeURL.XSD_BYTE, [ 'integer' ]],
        [ TypeURL.XSD_NON_NEGATIVE_INTEGER, [ 'integer' ]],
        [ TypeURL.XSD_POSITIVE_INTEGER, [ 'integer' ]],
        [ TypeURL.XSD_UNSIGNED_LONG, [ 'integer' ]],
        [ TypeURL.XSD_UNSIGNED_INT, [ 'integer' ]],
        [ TypeURL.XSD_UNSIGNED_SHORT, [ 'integer' ]],
        [ TypeURL.XSD_UNSIGNED_BYTE, [ 'integer' ]],
        [ TypeURL.XSD_INTEGER, [ 'integer' ]],
        [ TypeAlias.SPARQL_STRINGLY, [ 'string', 'langString' ]],
        [ TypeAlias.SPARQL_NUMERIC, [ 'decimal', 'float', 'integer', 'double' ]],
        [ 'http://example.com', [ 'other' ]],
      ];
      for (const [ typeUrl, argumentType ] of testArray) {
        expect(mainSparqlType(typeUrl).types).toEqual(argumentType);
      }
    });
  });
});
