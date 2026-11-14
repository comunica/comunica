import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import * as Eval from '@comunica/utils-expression-evaluator';
import {
  runFuncTestTable,
  dateTimeTyped,
  dateTyped,
  dayTimeDurationTyped,
  int,
  numeric,
  Notation,
  yearMonthDurationTyped,
} from '@comunica/utils-jest';
import type { FuncTestTableConfig } from '@comunica/utils-jest';
import { LRUCache } from 'lru-cache';
import { ActorFunctionFactoryTermAddition } from '../lib';

describe('evaluation of \'+\' like', () => {
  const baseConfig: FuncTestTableConfig<object> = {
    registeredActors: [
      args => new ActorFunctionFactoryTermAddition(args),
    ],
    arity: 2,
    operation: '+',
    aliases: numeric,
    notation: Notation.Infix,
  };
  runFuncTestTable({
    ...baseConfig,
    testTable: `
      0i 0i = 0i
      0i 1i = 1i
      1i 2i = 3i
    
      -0f -0f =  0f
      -0f -1f = -1f
      -1f -2f = -3f
      
      0i 1d = 1d
      1d 0i = 1d
    
       2i -1f = 1f
    
      -12f  INF =  INF
      -INF -12f = -INF
      -INF -INF = -INF
       INF  INF =  INF
       INF -INF =  NaN
    
      NaN    NaN    = NaN
      NaN    anyNum = NaN
      anyNum NaN    = NaN

      0i 0d = 0d
      0i 0f = 0f
      0i "0"^^xsd:double = "0.0E0"^^xsd:double
      0d 0i = 0d
      0d 0f = 0f
      0d "0"^^xsd:double = "0.0E0"^^xsd:double
      0f 0i = 0f
      0f 0d = 0f
      0f "0"^^xsd:double = "0.0E0"^^xsd:double
      "0"^^xsd:double 0i = "0.0E0"^^xsd:double
      "0"^^xsd:double 0d = "0.0E0"^^xsd:double
      "0"^^xsd:double 0f = "0.0E0"^^xsd:double
      
      '${dateTimeTyped('2012-02-28T12:14:45Z')}' '${dayTimeDurationTyped('P2D')}' = '${dateTimeTyped('2012-03-01T12:14:45Z')}'

      '${dateTimeTyped('2020-01-31T00:00:00Z')}' '${yearMonthDurationTyped('P1M')}' = '${dateTimeTyped('2020-02-29T00:00:00Z')}'
      '${dateTimeTyped('2019-01-31T23:59:59Z')}' '${yearMonthDurationTyped('P1M')}' = '${dateTimeTyped('2019-02-28T23:59:59Z')}'
      '${dateTimeTyped('2020-03-31T12:00:00Z')}' '${yearMonthDurationTyped('-P1M')}' = '${dateTimeTyped('2020-02-29T12:00:00Z')}'
      '${dateTimeTyped('2020-08-31T12:00:00Z')}' '${yearMonthDurationTyped('P1M')}' = '${dateTimeTyped('2020-09-30T12:00:00Z')}'
      '${dateTyped('2020-02-29')}' '${yearMonthDurationTyped('P1Y')}' = '${dateTyped('2021-02-28')}'
      '${dateTyped('2020-02-29')}' '${yearMonthDurationTyped('P4Y')}' = '${dateTyped('2024-02-29')}'
      '${dateTyped('2000-10-30')}' '${yearMonthDurationTyped('P1Y2M')}' = '${dateTyped('2001-12-30')}'
    `,
    errorTable: `
      "apple"^^xsd:integer "0"^^xsd:integer = 'Invalid lexical form'
    `,
  });
  runFuncTestTable({
    ...baseConfig,
    config: new ActionContext().set(KeysExpressionEvaluator.superTypeProvider, {
      cache: new LRUCache<string, any>({ max: 1_000 }),
      discoverer: () => Eval.TypeURL.XSD_INTEGER,
    }),
    testTable: `
      "2"^^example:int "3"^^example:int = ${int('5')}
    `,
  });
});
