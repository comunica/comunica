import { bool, dateTime, dateTyped, durationTyped, merge, numeric, str, timeTyped } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import type { ITestTableConfigBase } from '../../util/utils';
import { runTestTable } from '../../util/utils';

const config: ITestTableConfigBase = {
  arity: 2,
  operation: '!=',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
};

describe('evaluation of \'!=\'', () => {
  describe('with numeric operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        3i 3i = false
        3d 3d = false
        3f 3f = false
    
        3i -5i = true
        3d -5d = true
        3f -5f = true
    
         3i 3f = false
         3i 3d = false
         3d 3f = false
        -0f 0f = false
    
         INF  INF = false
        -INF -INF = false
         INF  3f  = true
         3f   INF = true
         INF  NaN = true
         NaN  NaN = true
         NaN  3f  = true
         3f   NaN = true
      `,
    });
  });

  describe('with string operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        empty empty = false
        empty aaa   = true
        aaa   aaa   = false
        aaa   bbb   = true
      `,
    });
  });

  describe('with boolean operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        true  true  = false
        true  false = true
        false true  = true
        false false = false
      `,
    });
  });

  describe('with dateTime operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        earlyN earlyZ = false
        earlyN earlyN = false
        earlyZ earlyZ = false
    
        earlyN lateN  = true
        earlyN lateZ  = true
        earlyZ lateZ  = true
        earlyZ lateN  = true
    
        edge1 edge2   = false
      `,
    });
  });

  describe('with date operants like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-date-equal
    runTestTable({
      operation: '!=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${dateTyped('2004-12-25Z')}' '${dateTyped('2004-12-25+07:00')}' = true
        '${dateTyped('2004-12-25-12:00')}' '${dateTyped('2004-12-26+12:00')}' = false
      `,
    });
  });

  describe('with time operants like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-time-equal
    runTestTable({
      operation: '!=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${timeTyped('08:00:00+09:00')}' '${timeTyped('17:00:00-06:00')}' = true
        '${timeTyped('21:30:00+10:30')}' '${timeTyped('06:00:00-05:00')}' = false
        '${timeTyped('24:00:00+01:00')}' '${timeTyped('00:00:00+01:00')}' = false
      `,
    });
  });

  describe('with duration operants like', () => {
    // These tests are just inverse of the spec tests of =
    runTestTable({
      operation: '!=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${durationTyped('P1Y')}' '${durationTyped('P1Y')}' = false
        '${durationTyped('P1Y')}' '${durationTyped('P12M')}' = false
        '${durationTyped('P1Y')}' '${durationTyped('P365D')}' = true
        '${durationTyped('P0Y')}' '${durationTyped('PT0S')}' = false
        '${durationTyped('P1D')}' '${durationTyped('PT24H')}' = false
        '${durationTyped('P1D')}' '${durationTyped('PT23H')}' = true
        '${durationTyped('PT1H')}' '${durationTyped('PT60M')}' = false
        '${durationTyped('PT1H')}' '${durationTyped('PT3600S')}' = false
        '${durationTyped('-P1Y')}' '${durationTyped('P1Y')}' = true
        '${durationTyped('-P0Y')}' '${durationTyped('PT0S')}' = false
      `,
    });
  });

  describe('with other operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        <http://example.com> <http://example.com> = false
        <http://example.com/a> <http://example.com/b> = true
        <http://example.com> 1 = true
        1 <http://example.com> = true
      `,
      errorTable: `
        1 true = 'Equality test for literals with unsupported datatypes'
        1 aaa = 'Equality test for literals with unsupported datatypes'
        1 earlyN = 'Equality test for literals with unsupported datatypes'
      `,
    });
  });

  describe('with quoted triple operands like', () => {
    // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#sparql-compare
    runTestTable({
      ...config,
      testArray: [
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123.0 >>', 'false' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123 >>', 'false' ],
        [ '<< << <ex:a> <ex:b> 123 >> <ex:q> 999 >>', '<< << <ex:a> <ex:b> 123.0 >> <ex:q> 999 >>', 'false' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123 >>', 'false' ],
        [ '<< <ex:a> <ex:b> 123e0 >>', '<< <ex:a> <ex:b> 123 >>', 'false' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 9 >>', 'true' ],
        [ '<< <ex:a> <ex:b> 9 >>', '<< <ex:a> <ex:b> 123 >>', 'true' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:c> <ex:d> 123 >>', 'true' ],
      ],
    });
  });
});
