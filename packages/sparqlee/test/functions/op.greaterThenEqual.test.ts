import { bool, dateTime, merge, numeric, str } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import type { ITestTableConfigBase } from '../util/utils';
import { runTestTable } from '../util/utils';

const config: ITestTableConfigBase = {
  arity: 2,
  operation: '>=',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
};

describe('evaluation of \'>=\'', () => {
  describe('with numeric operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        -5i 3i = false
        -5f 3f = false
        -5d 3d = false
        -5f 3i = false
        -5f 3i = false
    
        3i 3i = true
        3d 3d = true
        3f 3f = true
    
        3i -5i = true
        3d -5d = true
        3f -5f = true
        3i -5f = true
        3d -5f = true
    
         3i 3f = true
         3i 3d = true
         3d 3f = true
        -0f 0f = true
    
         INF  INF = true
        -INF -INF = true
         INF  3f  = true
         3f   INF = false
        -INF  3f  = false
         3f  -INF = true
    
        NaN    NaN    = false
        NaN    anyNum = false
        anyNum NaN    = false
      `,
    });
  });

  describe('with string operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        empty empty = true
        empty aaa   = false
        aaa   empty = true
        aaa   aaa   = true
        aaa   bbb   = false
        bbb   aaa   = true
      `,
    });
  });

  describe('with boolean operands like', () => {
    runTestTable({
      ...config,
      testTable: `
        true  true  = true
        true  false = true
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
    
        lateN earlyN  = true
        lateN earlyZ  = true
        lateZ earlyN  = true
        lateZ earlyZ  = true
    
        edge1 edge2   = true
      `,
    });
  });
});
