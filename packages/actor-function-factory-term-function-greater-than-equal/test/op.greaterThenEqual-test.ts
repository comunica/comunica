import { ActorFunctionFactoryTermFunctionEquality } from '@comunica/actor-function-factory-term-function-equality';
import { ActorFunctionFactoryTermFunctionLesserThan } from '@comunica/actor-function-factory-term-function-lesser-than';
import {
  ActorFunctionFactoryTermFunctionLesserThanEqual,
} from '@comunica/actor-function-factory-term-function-lesser-than-equal';
import type { FuncTestTableConfig } from '@comunica/bus-function-factory/test/util';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import {
  bool,
  dateTime,
  dateTyped,
  dayTimeDurationTyped,
  merge,
  numeric,
  str,
  timeTyped,
  yearMonthDurationTyped,
} from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionGreaterThanEqual } from '../lib';

const config: FuncTestTableConfig<object> = {
  registeredActors: [
    args => new ActorFunctionFactoryTermFunctionGreaterThanEqual(args),
    args => new ActorFunctionFactoryTermFunctionLesserThanEqual(args),
    args => new ActorFunctionFactoryTermFunctionLesserThan(args),
    args => new ActorFunctionFactoryTermFunctionEquality(args),
  ],
  arity: 2,
  operation: '>=',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
};

describe('evaluation of \'>=\'', () => {
  describe('with numeric operands like', () => {
    runFuncTestTable({
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
    runFuncTestTable({
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
    runFuncTestTable({
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
    runFuncTestTable({
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

  describe('with yearMonthDuration operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        '${yearMonthDurationTyped('P1Y')}' '${yearMonthDurationTyped('P1Y')}' = true
        '${yearMonthDurationTyped('P1Y')}' '${yearMonthDurationTyped('P12M')}' = true
        '${yearMonthDurationTyped('P1Y1M')}' '${yearMonthDurationTyped('P12M')}' = true
        '${yearMonthDurationTyped('P1M')}' '${yearMonthDurationTyped('-P2M')}' = true
        '${yearMonthDurationTyped('-P1Y')}' '${yearMonthDurationTyped('P13M')}' = false
      `,
    });
  });

  describe('with date operants like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-date-less-than
    runFuncTestTable({
      ...config,
      operation: '>=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${dateTyped('2004-12-25Z')}' '${dateTyped('2004-12-25+07:00')}' = true
        '${dateTyped('2004-12-25-12:00')}' '${dateTyped('2004-12-26+12:00')}' = true
      `,
    });
  });

  describe('with time operants like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-time-greater-than
    runFuncTestTable({
      ...config,
      operation: '>=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${timeTyped('08:00:00+09:00')}' '${timeTyped('17:00:00-06:00')}' = false
      `,
    });
  });

  describe('with dayTimeDuration operants like', () => {
    // Based on the spec tests of >
    runFuncTestTable({
      ...config,
      operation: '>=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${dayTimeDurationTyped('PT1H')}' '${dayTimeDurationTyped('PT60M')}' = true
        '${dayTimeDurationTyped('PT1H')}' '${dayTimeDurationTyped('PT63M')}' = false
        '${dayTimeDurationTyped('PT3S')}' '${dayTimeDurationTyped('PT2M')}' = false
        '${dayTimeDurationTyped('-PT1H1M')}' '${dayTimeDurationTyped('-PT62M')}' = true
        '${dayTimeDurationTyped('PT0S')}' '${dayTimeDurationTyped('-PT0.1S')}' = true
      `,
    });
  });

  describe('with quoted triple operands like', () => {
    // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#sparql-compare
    runFuncTestTable({
      ...config,
      testArray: [
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123.0 >>', 'true' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123 >>', 'true' ],
        [ '<< << <ex:a> <ex:b> 123 >> <ex:q> 999 >>', '<< << <ex:a> <ex:b> 123.0 >> <ex:q> 999 >>', 'true' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123 >>', 'true' ],
        [ '<< <ex:a> <ex:b> 123e0 >>', '<< <ex:a> <ex:b> 123 >>', 'true' ],
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
