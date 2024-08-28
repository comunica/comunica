import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import * as Eval from '@comunica/expression-evaluator';
import { dateTimeTyped, dayTimeDurationTyped, int, numeric } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import type { ITestTableConfigBase } from '@comunica/expression-evaluator/test/util/utils';
import { LRUCache } from 'lru-cache';
import { runFuncTestTable } from '../../../bus-function-factory/test/util';

describe('evaluation of \'+\' like', () => {
  const baseConfig: ITestTableConfigBase = {
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
