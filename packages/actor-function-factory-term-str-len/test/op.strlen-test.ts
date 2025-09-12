import type { FuncTestTableConfig } from '@comunica/bus-function-factory/test/util';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import * as Eval from '@comunica/utils-expression-evaluator';
import { compactTermString, int, merge, numeric, str } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { LRUCache } from 'lru-cache';
import { ActorFunctionFactoryTermStrLen } from '../lib';

describe('evaluation of \'strlen\' like', () => {
  const baseConfig: FuncTestTableConfig<object> = {
    registeredActors: [
      args => new ActorFunctionFactoryTermStrLen(args),
    ],
    arity: 1,
    operation: 'strlen',
    notation: Notation.Function,
    aliases: merge(numeric, str),
  };
  runFuncTestTable({
    ...baseConfig,
    testTable: `
        "aaa" = 3i
        "aaaa"@en = 4i
        "aa"^^xsd:string = 2i
        "👪"^^xsd:string = 1i
        "👨‍👩‍👧‍👦"^^xsd:string = ${int('7')}
        empty = '${int('0')}'
        '${compactTermString('Annabel', 'xsd:name')}' = '${int('7')}'
      `,
  });
  runFuncTestTable({
    ...baseConfig,
    evaluationActionContext: new ActionContext().set(KeysExpressionEvaluator.superTypeProvider, {
      cache: new LRUCache<string, any>({ max: 1_000 }),
      discoverer(unknownType: string) {
        if (unknownType.includes('specialString')) {
          return 'https://example.org/string';
        }
        return Eval.TypeURL.XSD_STRING;
      },
    }),
    testTable: `
      '"custom type"^^example:string' = ${int('11')}
      "apple"^^example:specialString = ${int('5')}
      `,
  });
});
