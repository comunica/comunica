import { bool, int, numeric } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';

describe('string functions', () => {
  describe('evaluation of \'strlen\' like', () => {
    runTestTable({
      arity: 1,
      operation: 'strlen',
      notation: Notation.Function,
      aliases: numeric,
      testTable: `
      "aaa" = 3i
      "aaaa"@en = 4i
      "aa"^^xsd:string = 2i
      "👪"^^xsd:string = 1i
      "👨‍👩‍👧‍👦"^^xsd:string = ${int('7')}
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
    runTestTable({
      arity: 'vary',
      operation: 'substr',
      notation: Notation.Function,
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
