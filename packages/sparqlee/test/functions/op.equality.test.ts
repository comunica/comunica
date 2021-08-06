import { bool, dateTime, merge, numeric, str } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import type { ITestTableConfigBase } from '../util/utils';
import { runTestTable } from '../util/utils';

const config: ITestTableConfigBase = {
  arity: 2,
  operation: '=',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
};

describe('evaluation of \'=\'', () => {
  describe('with numeric operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        3i 3i = true
        3d 3d = true
        3f 3f = true
    
        3i -5i = false
        3d -5d = false
        3f -5f = false
    
         3i 3f = true
         3i 3d = true
         3d 3f = true
        -0f 0f = true
    
         INF  INF = true
        -INF -INF = true
         INF  3f  = false
         3f   INF = false
         INF  NaN = false
         NaN  NaN = false
         NaN  3f  = false
         3f   NaN = false
      `,
    });
  });

  describe('with string operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        empty empty = true
        empty aaa   = false
        aaa   aaa   = true
        aaa   bbb   = false
      `,
    });
  });

  describe('with boolean operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        true  true  = true
        true  false = false
        false true  = false
        false false = true
      `,
    });
  });

  describe('with dateTime operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        earlyN earlyZ = true
        earlyN earlyN = true
        earlyZ earlyZ = true
    
        earlyN lateN  = false
        earlyN lateZ  = false
        earlyZ lateZ  = false
        earlyZ lateN  = false
    
        edge1 edge2   = true
      `,
    });
  });
});
