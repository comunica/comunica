import * as LRUCache from 'lru-cache';
import { TypeURL } from '../../../lib/util/Consts';
import { bool, int, numeric } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import type { ITestTableConfigBase } from '../../util/utils';
import { runTestTable } from '../../util/utils';

describe('string functions', () => {
  describe('evaluation of \'strlen\' like', () => {
    const baseConfig: ITestTableConfigBase = {
      arity: 1,
      operation: 'strlen',
      notation: Notation.Function,
      aliases: numeric,
    };
    runTestTable({
      ...baseConfig,
      testTable: `
        "aaa" = 3i
        "aaaa"@en = 4i
        "aa"^^xsd:string = 2i
        "👪"^^xsd:string = 1i
        "👨‍👩‍👧‍👦"^^xsd:string = ${int('7')}
      `,
    });
    runTestTable({
      ...baseConfig,
      config: {
        type: 'sync',
        config: {
          getSuperType(unknownType) {
            if (unknownType.includes('specialString')) {
              return 'https://example.org/string';
            }
            return TypeURL.XSD_STRING;
          },
          overloadCache: new LRUCache(),
          enableExtendedXsdTypes: true,
        },
      },
      testTable: `
      '"custom type"^^example:string' = ${int('11')}
      "apple"^^example:specialString = ${int('5')}
      `,
    });
  });

  // TODO: Add errors for when non BCP47 strings are passed
  describe('evaluation of \'langMatches\' like', () => {
    runTestTable({
      arity: 2,
      operation: 'langMatches',
      notation: Notation.Function,
      aliases: bool,
      testTable: `
       "de-DE" "de-*-DE" = true
       "de-de" "de-*-DE" = true
       "de-Latn-DE" "de-*-DE" = true
       "de-Latf-DE" "de-*-DE" = true
       "de-DE-x-goethe" "de-*-DE" = true
       "de-Latn-DE-1996" "de-*-DE" = true
       "de" "de-*-DE" = false
       "de-X-De" "de-*-DE" = false
       "de-Deva" "de-*-DE" = false
      `,
    });
  });

  describe('evaluations of \'substr\' like', () => {
    // Last test is dedicated to type promotion
    runTestTable({
      arity: 'vary',
      operation: 'substr',
      notation: Notation.Function,
      config: {
        type: 'sync',
        config: {
          getSuperType: unknownType => TypeURL.XSD_STRING,
          enableExtendedXsdTypes: true,
        },
      },
      testTable: `
      "bar" 1 1 = "b"
      "bar" 2 = "ar"
      "👪" 2 = ""
      "👨‍👩‍👧‍👦" 2 = "‍👩‍👧‍👦"
      "👪" 1 1 = "👪"
      "👨‍👩‍👧‍👦" 1 1 = "👨"
      "bar"@en 1 1 = "b"@en
      "bar"@en 2 = "ar"@en
      "👪"@en 2 = ""@en
      "👨‍👩‍👧‍👦"@en 2 = "‍👩‍👧‍👦"@en
      "👪"@en 1 1 = "👪"@en
      "👨‍👩‍👧‍👦"@en 1 1 = "👨"@en
      "apple"@en 2 1 = "p"@en
      '"type promotion"^^xsd:anyURI' 2 3 = "ype"
      '"type promotion"^^xsd:anyURI' 6 5 = "promo"
      '"type promotion"^^xsd:anyURI' 6 1 = "p"
      '"custom type"^^example:string' 3 15 = '"stom type"'
      `,
    });
  });

  describe('evaluation of \'regex\' like', () => {
    // TODO: Test better
    runTestTable({
      arity: 2,
      operation: 'regex',
      notation: Notation.Function,
      aliases: bool,
      testTable: `
      "simple" "simple" = true
      "aaaaaa" "a" = true
      "simple" "blurgh" = false
      `,
    });
  });
});
