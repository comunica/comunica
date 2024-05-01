import {
  bool,
  dateTime,
  dateTyped,
  merge,
  numeric,
  str,
  timeTyped,
} from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import type { ITestTableConfigBase } from '@comunica/expression-evaluator/test/util/utils';
import { runFuncTestTable } from '../util';

const config: ITestTableConfigBase = {
  arity: 2,
  operation: '>',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
};

describe('evaluation of \'>\'', () => {
  describe('with numeric operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        -5i 3i = false
        -5f 3f = false
        -5d 3d = false
        -5f 3i = false
        -5f 3i = false
    
        3i 3i = false
        3d 3d = false
        3f 3f = false
    
        3i -5i = true
        3d -5d = true
        3f -5f = true
        3i -5f = true
        3d -5f = true
    
         3i 3f = false
         3i 3d = false
         3d 3f = false
        -0f 0f = false
    
         INF  INF = false
        -INF -INF = false
         INF  3f  = true
         3f   INF = false
        -INF  3f  = false
         3f  -INF = true
    
        INF NaN = false
        NaN NaN = false
        NaN 3f  = false
        3f  NaN = false
      `,
      errorTable: `
        "2"^^example:int "0"^^example:int = 'Argument types not valid for operator'
      `,
    });
  });

  describe('with string operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        empty empty = false
        empty aaa   = false
        aaa   empty = true
        aaa   aaa   = false
        aaa   bbb   = false
        bbb   aaa   = true
      `,
    });
  });

  describe('with boolean operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        true  true  = false
        true  false = true
        false true  = false
        false false = false
      `,
    });
  });

  describe('with dateTime operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        earlyN earlyZ = false
        earlyN earlyN = false
        earlyZ earlyZ = false
    
        earlyN lateN  = false
        earlyN lateZ  = false
        earlyZ lateZ  = false
        earlyZ lateN  = false
    
        lateN earlyN  = true
        lateN earlyZ  = true
        lateZ earlyN  = true
        lateZ earlyZ  = true
    
        edge1 edge2   = false
      `,
    });
  });

  describe('with date operants like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-date-less-than
    runFuncTestTable({
      operation: '>',
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
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-time-greater-than
    runFuncTestTable({
      operation: '>',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${timeTyped('08:00:00+09:00')}' '${timeTyped('17:00:00-06:00')}' = false
      `,
    });
  });

  describe('with quoted triple operands like', () => {
    // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#sparql-compare
    runFuncTestTable({
      ...config,
      testArray: [
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123.0 >>', 'false' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123 >>', 'false' ],
        [ '<< << <ex:a> <ex:b> 123 >> <ex:q> 999 >>', '<< << <ex:a> <ex:b> 123.0 >> <ex:q> 999 >>', 'false' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123 >>', 'false' ],
        [ '<< <ex:a> <ex:b> 123e0 >>', '<< <ex:a> <ex:b> 123 >>', 'false' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 9 >>', 'true' ],
        [ '<< <ex:a> <ex:b> 9 >>', '<< <ex:a> <ex:b> 123 >>', 'false' ],
      ],
    });
    runFuncTestTable({
      ...config,
      errorArray: [
        // Named nodes cannot be compared.
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:c> <ex:d> 123 >>', 'Argument types not valid for operator' ],
      ],
    });
  });
});
