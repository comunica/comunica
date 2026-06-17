import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import { ActorFunctionFactoryTermLesserThan } from '@comunica/actor-function-factory-term-lesser-than';
import { ActorFunctionFactoryTermTriple } from '@comunica/actor-function-factory-term-triple';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { FuncTestTableConfig } from '@comunica/utils-jest';
import {
  runFuncTestTable,
  bool,
  dateTime,
  dateTyped,
  dayTimeDurationTyped,
  merge,
  numeric,
  str,
  timeTyped,
  yearMonthDurationTyped,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryTermLesserThanEqual } from '../lib';

const config: FuncTestTableConfig<object> = {
  registeredActors: [
    args => new ActorFunctionFactoryTermLesserThanEqual(args),
    args => new ActorFunctionFactoryTermEquality(args),
    args => new ActorFunctionFactoryTermLesserThan(args),
    args => new ActorFunctionFactoryTermTriple(args),
  ],
  arity: 2,
  operation: '<=',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
};

describe('evaluation of \'<=\'', () => {
  describe('with numeric operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        -5i 3i = true
        -5f 3f = true
        -5d 3d = true
        -5f 3i = true
        -5f 3i = true
    
        3i 3i = true
        3d 3d = true
        3f 3f = true
    
        3i -5i = false
        3d -5d = false
        3f -5f = false
        3i -5f = false
        3d -5f = false
    
         3i 3f = true
         3i 3d = true
         3d 3f = true
        -0f 0f = true
    
         INF  INF = true
        -INF -INF = true
         INF  3f  = false
         3f   INF = true
        -INF  3f  = true
         3f  -INF = false
    
        NaN    NaN    = false
        NaN    anyNum = false
        anyNum NaN    = false
      `,
    });
  });

  describe('with string operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        empty empty = true
        empty aaa   = true
        aaa   empty = false
        aaa   aaa   = true
        aaa   bbb   = true
        bbb   aaa   = false
      `,
    });
  });

  describe('with boolean operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        true  true  = true
        true  false = false
        false true  = true
        false false = true
      `,
    });
  });

  describe('with dateTime operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        earlyN earlyZ = true
        earlyN earlyN = true
        earlyZ earlyZ = true
    
        earlyN lateN  = true
        earlyN lateZ  = true
        earlyZ lateZ  = true
        earlyZ lateN  = true
    
        lateN earlyN  = false
        lateN earlyZ  = false
        lateZ earlyN  = false
        lateZ earlyZ  = false
    
        edge1 edge2   = true
      `,
    });
  });

  describe('with yearMonthDuration operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        '${yearMonthDurationTyped('P1Y')}' '${yearMonthDurationTyped('P1Y')}' = true
        '${yearMonthDurationTyped('P1Y')}' '${yearMonthDurationTyped('P12M')}' = true
        '${yearMonthDurationTyped('P1Y1M')}' '${yearMonthDurationTyped('P12M')}' = false
        '${yearMonthDurationTyped('P1M')}' '${yearMonthDurationTyped('-P2M')}' = false
        '${yearMonthDurationTyped('-P1Y')}' '${yearMonthDurationTyped('P13M')}' = true
      `,
    });
  });

  describe('with date operants like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-date-less-than
    runFuncTestTable({
      ...config,
      operation: '<=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${dateTyped('2004-12-25Z')}' '${dateTyped('2004-12-25-05:00')}' = true
        '${dateTyped('2004-12-25-12:00')}' '${dateTyped('2004-12-26+12:00')}' = true
      `,
    });
  });

  describe('with time operants like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-time-less-than
    runFuncTestTable({
      ...config,
      operation: '<=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      config: new ActionContext().set(KeysExpressionEvaluator.defaultTimeZone, { zoneHours: -5, zoneMinutes: 0 }),
      testTable: `
        '${timeTyped('12:00:00')}' '${timeTyped('23:00:00+06:00')}' = true
        '${timeTyped('11:00:00')}' '${timeTyped('17:00:00Z')}' = true
        '${timeTyped('23:59:59')}' '${timeTyped('24:00:00')}' = false
      `,
    });
  });

  describe('with dayTimeDuration operants like', () => {
    // Based on the spec tests of <
    runFuncTestTable({
      ...config,
      operation: '<=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${dayTimeDurationTyped('PT1H')}' '${dayTimeDurationTyped('PT63M')}' = true
        '${dayTimeDurationTyped('PT3S')}' '${dayTimeDurationTyped('PT2M')}' = true
        '${dayTimeDurationTyped('-PT1H1M')}' '${dayTimeDurationTyped('-PT62M')}' = false
        '${dayTimeDurationTyped('PT0S')}' '${dayTimeDurationTyped('-PT0.1S')}' = false
      `,
    });
  });

  describe('with quoted triple operands like', () => {
    // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#sparql-compare
    runFuncTestTable({
      ...config,
      testArray: [
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 123.0 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123e0 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 9 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 9 )>>', 'false' ],
      ],
    });
    runFuncTestTable({
      ...config,
      errorArray: [
        // Named nodes cannot be compared.
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:c> <ex:d> 123 )>>', 'Argument types not valid for operator:' ],
      ],
    });
  });
});
