import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import * as Eval from '@comunica/utils-expression-evaluator';
import {
  runFuncTestTable,
  Notation,
} from '@comunica/utils-jest';
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
      "bar"@en--ltr 1 1 = "b"@en--ltr
      "bar"@en--ltr 2 = "ar"@en--ltr
      "👪"@en 2 = ""@en
      "👨‍👩‍👧‍👦"@en 2 = "‍👩‍👧‍👦"@en
      "👪"@en 1 1 = "👪"@en
      "👨‍👩‍👧‍👦"@en 1 1 = "👨"@en
      "apple"@en 2 1 = "p"@en
      '"type promotion"^^xsd:anyURI' 2 3 = "ype"
      '"type promotion"^^xsd:anyURI' 6 5 = "promo"
      '"type promotion"^^xsd:anyURI' 6 1 = "p"
      '"custom type"^^example:string' 3 15 = '"stom type"'
      "12345" 0 = "12345"
      "12345" -1 = "12345"
      "12345" 0 3 = "12"
      "12345" -3 5 = "1"
      "12345" -1 4 = "12"
      "12345" 2 -1 = ""
      "12345" 0 -1 = ""
      "12345" 6 = ""
      "12345" 4 10 = "45"
      "12345"@en 0 = "12345"@en
      "12345"@en 0 3 = "12"@en
      "12345"@en--ltr 0 = "12345"@en--ltr
      "12345"@en--ltr -3 5 = "1"@en--ltr
      `,
  });
});
