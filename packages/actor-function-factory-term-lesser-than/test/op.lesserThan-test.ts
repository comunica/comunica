import { ActorFunctionFactoryExpressionBnode } from '@comunica/actor-function-factory-expression-bnode';
import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import type { FuncTestTableConfig } from '@comunica/bus-function-factory/test/util';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import {
  bool,
  dateTime,
  dateTyped,
  merge,
  numeric,
  str,
  timeTyped,
} from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermLesserThan } from '../lib';

const config: FuncTestTableConfig<object> = {
  registeredActors: [
    args => new ActorFunctionFactoryExpressionBnode(args),
    args => new ActorFunctionFactoryTermLesserThan(args),
    args => new ActorFunctionFactoryTermEquality(args),
  ],
  arity: 2,
  operation: '<',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
};

describe('evaluation of \'<\'', () => {
  describe('with numeric operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        -5i 3i = true
        -5f 3f = true
        -5d 3d = true
        -5f 3i = true
        -5f 3d = true
    
        3i 3i = false
        3d 3d = false
        3f 3f = false
    
        3i -5i = false
        3d -5d = false
        3f -5f = false
        3i -5f = false
        3d -5f = false
    
         3i 3f = false
         3i 3d = false
         3d 3f = false
        -0f 0f = false
    
         INF  INF = false
        -INF -INF = false
         INF  3f  = false
         3f   INF = true
        -INF  3f  = true
         3f  -INF = false
    
        INF NaN = false
        NaN NaN = false
        NaN 3f  = false
        3f NaN  = false
      `,
    });
  });

  describe('with string operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        empty empty = false
        empty aaa   = true
        aaa   empty = false
        aaa   aaa   = false
        aaa   bbb   = true
        bbb   aaa   = false
      `,
    });
  });

  describe('with boolean operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        true  true  = false
        true  false = false
        false true  = true
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
    
        earlyN lateN  = true
        earlyN lateZ  = true
        earlyZ lateZ  = true
        earlyZ lateN  = true
    
        lateN earlyN  = false
        lateN earlyZ  = false
        lateZ earlyN  = false
        lateZ earlyZ  = false
    
        edge1 edge2   = false
      `,
    });
  });

  describe('with date operands like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-date-less-than
    runFuncTestTable({
      ...config,
      operation: '<',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${dateTyped('2004-12-25Z')}' '${dateTyped('2004-12-25-05:00')}' = true
        '${dateTyped('2004-12-25-12:00')}' '${dateTyped('2004-12-26+12:00')}' = false
      `,
    });
  });

  describe('with time operands like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-time-less-than
    runFuncTestTable({
      ...config,
      operation: '<',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      config: new ActionContext().set(KeysExpressionEvaluator.defaultTimeZone, { zoneHours: -5, zoneMinutes: 0 }),
      testTable: `
        '${timeTyped('12:00:00')}' '${timeTyped('23:00:00+06:00')}' = false
        '${timeTyped('11:00:00')}' '${timeTyped('17:00:00Z')}' = true
        '${timeTyped('23:59:59')}' '${timeTyped('24:00:00')}' = false
      `,
    });
  });

  describe('with quoted triple operands like', () => {
    // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#sparql-compare
    runFuncTestTable({
      ...config,
      testArray: [
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 123.0 )>>', 'false' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'false' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'false' ],
        [ '<<( <ex:a> <ex:b> 123e0 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'false' ],
        [ '<<( <ex:a> <ex:b> 9 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 9 )>>', 'false' ],
      ],
    });
  });

  describe('with named nodes operands like', () => {
    runFuncTestTable({
      ...config,
<<<<<<< HEAD
      errorArray: [
        // Named nodes cannot be compared.
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:c> <ex:d> 123 )>>', 'Argument types not valid for operator:' ],
=======
      testArray: [
        [ '<ex:ab>', '<ex:cd>', 'true' ],
        [ '<ex:ad>', '<ex:bc>', 'true' ],
        [ '<ex:ba>', '<ex:ab>', 'false' ],
        [ '<ex:ab>', '<ex:ab>', 'false' ],
>>>>>>> edfd6ea90a (#1501: added support for named nodes)
      ],
    });
  });

  describe('with blank nodes operands like', () => {
    runFuncTestTable({
      ...config,
      testArray: [
        [ 'BNODE("ab")', 'BNODE("cd")', 'true' ],
        [ 'BNODE("ad")', 'BNODE("bc")', 'true' ],
        [ 'BNODE("ba")', 'BNODE("ab")', 'false' ],
        [ 'BNODE("ab")', 'BNODE("ab")', 'false' ],
      ],
    });
  });

  describe('with mixed terms operands like', () => {
    runFuncTestTable({
      ...config,
      testArray: [
        [ 'BNODE("ab")', '<ex:ab>', 'true' ],
        [ '<< <ex:a> <ex:b> 123 >>', '123', 'false' ],
        [ '<ex:ab>', '"ab"', 'true' ],
        [ 'BNODE("ab")', '<< <ex:a> <ex:b> 123 >>', 'true' ],
      ],
    });
  });
});
