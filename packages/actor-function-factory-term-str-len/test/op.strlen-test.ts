import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import * as Eval from '@comunica/utils-expression-evaluator';
import {
  runFuncTestTable,
  compactTermString,
  int,
  merge,
  numeric,
  str,
  Notation,
} from '@comunica/utils-jest';
import type { FuncTestTableConfig } from '@comunica/utils-jest';
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
    config: new ActionContext().set(KeysExpressionEvaluator.superTypeProvider, {
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
