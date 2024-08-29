import { ActorFunctionFactoryTermFunctionContains } from '@comunica/actor-function-factory-term-function-contains';
import {
  ActorFunctionFactoryTermFunctionLangmatches,
} from '@comunica/actor-function-factory-term-function-langmatches';
import { ActorFunctionFactoryTermFunctionRegex } from '@comunica/actor-function-factory-term-function-regex';
import { ActorFunctionFactoryTermFunctionReplace } from '@comunica/actor-function-factory-term-function-replace';
import { ActorFunctionFactoryTermFunctionStrAfter } from '@comunica/actor-function-factory-term-function-str-after';
import { ActorFunctionFactoryTermFunctionStrBefore } from '@comunica/actor-function-factory-term-function-str-before';
import { ActorFunctionFactoryTermFunctionStrEnds } from '@comunica/actor-function-factory-term-function-str-ends';
import { ActorFunctionFactoryTermFunctionStrStarts } from '@comunica/actor-function-factory-term-function-str-starts';
import { ActorFunctionFactoryTermFunctionSubStr } from '@comunica/actor-function-factory-term-function-sub-str';
import type { FuncTestTableConfig } from '@comunica/bus-function-factory/test/util';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import * as Eval from '@comunica/expression-evaluator';
import { bool, int, numeric } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { LRUCache } from 'lru-cache';
import { ActorFunctionFactoryTermFunctionStrLen } from '../lib';

describe('string functions', () => {
  describe('evaluation of \'strlen\' like', () => {
    const baseConfig: FuncTestTableConfig<object> = {
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionStrLen(args),
      ],
      arity: 1,
      operation: 'strlen',
      notation: Notation.Function,
      aliases: numeric,
    };
    runFuncTestTable({
      ...baseConfig,
      testTable: `
        "aaa" = 3i
        "aaaa"@en = 4i
        "aa"^^xsd:string = 2i
        "👪"^^xsd:string = 1i
        "👨‍👩‍👧‍👦"^^xsd:string = ${int('7')}
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

  describe('evaluation of \'strstarts\' like', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionStrStarts(args),
      ],
      arity: 2,
      operation: 'strstarts',
      notation: Notation.Function,
      aliases: bool,
      testTable: `
       "ab" "a" = true
       "ab" "c" = false
       "ab"@en "a"@en = true
       "ab"@en "c"@en = false
      `,
      errorTable: `
       "ab"@en "a"@fr = 'Operation on incompatible language literals'
      `,
    });
  });

  describe('evaluation of \'strends\' like', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionStrEnds(args),
      ],
      arity: 2,
      operation: 'strends',
      notation: Notation.Function,
      aliases: bool,
      testTable: `
       "ab" "b" = true
       "ab" "c" = false
       "ab"@en "b"@en = true
       "ab"@en "c"@en = false
      `,
      errorTable: `
       "ab"@en "b"@fr = 'Operation on incompatible language literals'
      `,
    });
  });

  describe('evaluation of \'contains\' like', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionContains(args),
      ],
      arity: 2,
      operation: 'contains',
      notation: Notation.Function,
      aliases: bool,
      testTable: `
       "aa" "a" = true
       "aa" "b" = false
       "aa"@en "a"@en = true
       "aa"@en "b"@en = false
       '"some string"' '"e s"' = true
      `,
      errorTable: `
       "aa"@en "a"@fr = 'Operation on incompatible language literals'
      `,
    });
  });

  // TODO: Add errors for when non BCP47 strings are passed
  describe('evaluation of \'langMatches\' like', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionLangmatches(args),
      ],
      arity: 2,
      operation: 'langMatches',
      notation: Notation.Function,
      aliases: bool,
      testTable: `
       "de-DE" "de-*-DE" = true
       "de-de" "de-*-DE" = true
       "de-Latn-DE" "de-*-DE" = true
       "de-Latf-DE" "de-*-DE" = true
       "de-DE-x-goethe" "de-*-DE" = true
       "de-Latn-DE-1996" "de-*-DE" = true
       "de" "de-*-DE" = false
       "de-X-De" "de-*-DE" = false
       "de-Deva" "de-*-DE" = false
       "de" "fr" = false
      `,
    });
  });

  describe('evaluations of \'strbefore\' like', () => {
    // Inspired on the specs: https://www.w3.org/TR/sparql11-query/#func-strbefore
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionStrBefore(args),
      ],
      arity: 2,
      aliases: bool,
      operation: 'STRBEFORE',
      notation: Notation.Function,
      testTable: `
        "abc" "b" = "a"
        "abc"@en "bc" = "a"@en
        "abc"^^xsd:string "" = ""^^xsd:string
        "abc" "xyz" = ""
        "abc"@en "z"@en = ""
        "abc" "z" = ""
        "abc"@en ""@en = ""@en
        "abc"@en "" = ""@en
      `,
      errorTable: `
        "abc"@en "b"@cy = 'Operation on incompatible language literals'
      `,
    });
  });

  describe('evaluations of \'strafter\' like', () => {
    // Inspired on the specs: https://www.w3.org/TR/sparql11-query/#func-strafter
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionStrAfter(args),
      ],
      arity: 2,
      aliases: bool,
      operation: 'STRAFTER',
      notation: Notation.Function,
      testTable: `
        "abc" "b" = "c"
        "abc"@en "ab" = "c"@en
        "abc"^^xsd:string "" = "abc"^^xsd:string
        "abc" "xyz" = ""
        "abc"@en "z"@en = ""
        "abc" "z" = ""
        "abc"@en ""@en = "abc"@en
        "abc"@en "" = "abc"@en
      `,
      errorTable: `
        "abc"@en "b"@cy = 'Operation on incompatible language literals'
      `,
    });
  });

  describe('evaluations of \'substr\' like', () => {
    // Last test is dedicated to type promotion
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionSubStr(args),
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

  describe('evaluation of \'regex\' like', () => {
    // TODO: Test better
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionRegex(args),
      ],
      arity: 'vary',
      operation: 'regex',
      notation: Notation.Function,
      aliases: bool,
      testTable: `
      "simple" "simple" = true
      "aaaaaa" "a" = true
      "simple" "blurgh" = false
      "aaa" "a+" = true
      "AAA" "a+" = false
      "AAA" "a+" "i" = true
      "a\\na" ".+" "s" = true
      "a\\nb\\nc" "^b$" = false
      "a\\nb\\nc" "^b$" "m" = true
      `,
    });
  });

  describe('evaluation of \'replace\' like', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionReplace(args),
      ],
      arity: 'vary',
      operation: 'replace',
      notation: Notation.Function,
      testTable: `
      "baaab" "a+" "c" = "bcb"
      "bAAAb" "a+" "c" = "bAAAb"
      "bAAAb" "a+" "c" "i" = "bcb"
      "baaab"@en "a+" "c" = "bcb"@en
      "bAAAb"@en "a+" "c" "i" = "bcb"@en
      `,
    });
  });
});
