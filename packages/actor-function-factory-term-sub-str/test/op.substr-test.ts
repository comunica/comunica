import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import * as Eval from '@comunica/utils-expression-evaluator';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { LRUCache } from 'lru-cache';
import { ActorFunctionFactoryTermSubStr } from '../lib';

describe('evaluations of \'substr\' like', () => {
  // Last test is dedicated to type promotion
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermSubStr(args),
    ],
    arity: 'vary',
    operation: 'substr',
    notation: Notation.Function,
    config: new ActionContext().set(KeysExpressionEvaluator.superTypeProvider, {
      cache: new LRUCache<string, any>({ max: 1_000 }),
      discoverer: () => Eval.TypeURL.XSD_STRING,
    }),
    testTable: `
      "bar" 1 1 = "b"
      "bar" 2 = "ar"
      "👪" 2 = ""
      "👨‍👩‍👧‍👦" 2 = "‍👩‍👧‍👦"
      "👪" 1 1 = "👪"
      "👨‍👩‍👧‍👦" 1 1 = "👨"
      "bar"@en 1 1 = "b"@en
      "bar"@en 2 = "ar"@en
      "👪"@en 2 = ""@en
      "👨‍👩‍👧‍👦"@en 2 = "‍👩‍👧‍👦"@en
      "👪"@en 1 1 = "👪"@en
      "👨‍👩‍👧‍👦"@en 1 1 = "👨"@en
      "apple"@en 2 1 = "p"@en
      '"type promotion"^^xsd:anyURI' 2 3 = "ype"
      '"type promotion"^^xsd:anyURI' 6 5 = "promo"
      '"type promotion"^^xsd:anyURI' 6 1 = "p"
      '"custom type"^^example:string' 3 15 = '"stom type"'
      `,
  });
});
