import { ActorFunctionFactoryExpressionBnode } from '@comunica/actor-function-factory-expression-bnode';
import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import { ActorFunctionFactoryTermTriple } from '@comunica/actor-function-factory-term-triple';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import * as Eval from '@comunica/utils-expression-evaluator';
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
import { LRUCache } from 'lru-cache';
import { ActorFunctionFactoryTermLesserThan } from '../lib';

const config: FuncTestTableConfig<object> = {
  registeredActors: [
    args => new ActorFunctionFactoryExpressionBnode(args),
    args => new ActorFunctionFactoryTermLesserThan(args),
    args => new ActorFunctionFactoryTermEquality(args),
    args => new ActorFunctionFactoryTermTriple(args),
  ],
  arity: 2,
  operation: '<',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
};

const nonLexicalEvalContext: FuncTestTableConfig<object> = {
  ...config,
  config: new ActionContext({
    [KeysExpressionEvaluator.nonLexicalComparison.name]: true,
  }),
};

const fullTermEvalContext: FuncTestTableConfig<object> = {
  ...config,
  config: new ActionContext({
    [KeysExpressionEvaluator.fullTermComparison.name]: true,
  }),
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

  describe('with language string operands like', () => {
    runFuncTestTable({
      ...config,
      errorTable: `
        "a"@en "b"@de = 'Argument types not valid'
        "a"@en "a"@de = 'Argument types not valid'
        "a"@en "a"@en = 'Argument types not valid'
      `,
    });
  });

  describe('with language string operands and fullTermComparison like', () => {
    runFuncTestTable({
      ...fullTermEvalContext,
      testTable: `
        "a"@en "b"@de = true
        "a"@en "a"@de = false
        "a"@en "a"@en = false
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
      testTable: `
        '${dateTyped('2004-12-25Z')}' '${dateTyped('2004-12-25-05:00')}' = true
        '${dateTyped('2004-12-25-12:00')}' '${dateTyped('2004-12-26+12:00')}' = false
      `,
    });
  });

  describe('with yearMonthDuration operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        '${yearMonthDurationTyped('P1Y')}' '${yearMonthDurationTyped('P1Y')}' = false
        '${yearMonthDurationTyped('P1Y')}' '${yearMonthDurationTyped('P12M')}' = false
        '${yearMonthDurationTyped('P1Y1M')}' '${yearMonthDurationTyped('P12M')}' = false
        '${yearMonthDurationTyped('P1M')}' '${yearMonthDurationTyped('-P2M')}' = false
        '${yearMonthDurationTyped('-P1Y')}' '${yearMonthDurationTyped('P13M')}' = true
      `,
    });
  });

  describe('with dayTimeDuration operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        '${dayTimeDurationTyped('PT1H')}' '${dayTimeDurationTyped('PT63M')}' = true
        '${dayTimeDurationTyped('PT3S')}' '${dayTimeDurationTyped('PT2M')}' = true
        '${dayTimeDurationTyped('-PT1H1M')}' '${dayTimeDurationTyped('-PT62M')}' = false
        '${dayTimeDurationTyped('PT0S')}' '${dayTimeDurationTyped('-PT0.1S')}' = false
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
      config: new ActionContext()
        .set(KeysExpressionEvaluator.defaultTimeZone, { zoneHours: -5, zoneMinutes: 0 }),
      testTable: `
        '${timeTyped('12:00:00')}' '${timeTyped('23:00:00+06:00')}' = false
        '${timeTyped('11:00:00')}' '${timeTyped('17:00:00Z')}' = true
        '${timeTyped('23:59:59')}' '${timeTyped('24:00:00')}' = false
      `,
    });
  });

  describe('with numeric and type discovery like', () => {
    runFuncTestTable({
      ...config,
      config: new ActionContext().set(KeysExpressionEvaluator.superTypeProvider, {
        cache: new LRUCache<string, any>({ max: 1_000 }),
        discoverer: () => Eval.TypeURL.XSD_INTEGER,
      }),
      testTable: `
        "2"^^example:int "2"^^example:int = false
        "2"^^example:int "3"^^example:int = true
        
        "01"^^example:int "2"^^example:int = true
        "100"^^example:int "25"^^example:int = false
      `,
    });
  });

  describe('with literals of unknown types like', () => {
    runFuncTestTable({
      ...config,
      errorTable: `
        "2"^^example:int "0"^^example:int = 'Argument types not valid'
        "abc"^^example:string "def"^^example:string = 'Argument types not valid'
        "2"^^example:int "abc"^^example:string = 'Argument types not valid'
        "2"^^example:int "2"^^example:string = 'Argument types not valid'
        "2"^^example:string "2"^^example:int = 'Argument types not valid'
        "2"^^example:string "2"^^example:string = 'Argument types not valid'
        
        "01"^^example:int "2"^^example:int = 'Argument types not valid'
        "100"^^example:int "25"^^example:int = 'Argument types not valid'
      `,
    });
  });

  describe('with literals of unknown types and fullTermComparison like', () => {
    runFuncTestTable({
      ...fullTermEvalContext,
      testTable: `
        "2"^^example:int "0"^^example:int = false
        "abc"^^example:string "def"^^example:string = true
        "2"^^example:int "abc"^^example:string = true
        "2"^^example:int "2"^^example:string = true
        "2"^^example:string "2"^^example:int = false
        "2"^^example:string "2"^^example:string = false
        
        "01"^^example:int "2"^^example:int = true
        "100"^^example:int "25"^^example:int = true
      `,
    });
  });

  describe('with non lexical operands like', () => {
    runFuncTestTable({
      ...config,
      errorTable: `
        "a"^^xsd:dateTime    "b"^^xsd:dateTime   = 'Invalid lexical form'
        "a"^^xsd:dateTime    "a"^^xsd:dateTime   = 'Invalid lexical form'
        "a"^^xsd:boolean     "b"^^xsd:boolean    = 'Invalid lexical form'
        "a"^^xsd:boolean     "a"^^xsd:dateTime   = 'Argument types not valid'
        "a"^^xsd:boolean     "true"^^xsd:boolean = 'Invalid lexical form'
        earlyN               "a"^^xsd:dateTime   = 'Invalid lexical form'
        "true"^^xsd:boolean  "a"^^xsd:dateTime   = 'Argument types not valid'
        
        "a"^^xsd:integer           "b"^^xsd:decimal           = 'Invalid lexical form'
        "a"^^xsd:yearMonthDuration "b"^^xsd:yearMonthDuration = 'Invalid lexical form'
        "a"^^xsd:dayTimeDuration   "b"^^xsd:dayTimeDuration   = 'Invalid lexical form'
        "a"^^xsd:time              "b"^^xsd:time              = 'Invalid lexical form'
      `,
    });
  });

  describe('with non lexical operands and nonLiteralComparison like', () => {
    runFuncTestTable({
      ...nonLexicalEvalContext,
      testTable: `
        "a"^^xsd:dateTime    "b"^^xsd:dateTime   = true
        "a"^^xsd:dateTime    "a"^^xsd:dateTime   = false
        "a"^^xsd:boolean     "b"^^xsd:boolean    = true
        "a"^^xsd:boolean     "true"^^xsd:boolean = true
        earlyN               "a"^^xsd:dateTime   = true
        
        "a"^^xsd:integer           "b"^^xsd:decimal           = true
        "a"^^xsd:yearMonthDuration "b"^^xsd:yearMonthDuration = true
        "a"^^xsd:dayTimeDuration   "b"^^xsd:dayTimeDuration   = true
        "a"^^xsd:time              "b"^^xsd:time              = true
      `,
      errorTable: `
        "a"^^xsd:boolean     "a"^^xsd:dateTime   = 'Argument types not valid'
        "true"^^xsd:boolean  "a"^^xsd:dateTime   = 'Argument types not valid'
      `,
    });
  });

  describe('with non lexical operands and both comparison options like', () => {
    runFuncTestTable({
      ...config,
      config: new ActionContext({
        [KeysExpressionEvaluator.nonLexicalComparison.name]: true,
        [KeysExpressionEvaluator.fullTermComparison.name]: true,
      }),
      testTable: `
        "a"^^xsd:dateTime    "b"^^xsd:dateTime   = true
        "a"^^xsd:dateTime    "a"^^xsd:dateTime   = false
        "a"^^xsd:boolean     "b"^^xsd:boolean    = true
        "a"^^xsd:boolean     "a"^^xsd:dateTime   = false
        "a"^^xsd:boolean     "true"^^xsd:boolean = true
        earlyN               "a"^^xsd:dateTime   = true
        "true"^^xsd:boolean  "a"^^xsd:dateTime   = false
        
        "a"^^xsd:integer           "b"^^xsd:decimal           = true
        "a"^^xsd:yearMonthDuration "b"^^xsd:yearMonthDuration = true
        "a"^^xsd:dayTimeDuration   "b"^^xsd:dayTimeDuration   = true
        "a"^^xsd:time              "b"^^xsd:time              = true
      `,
    });
  });

  describe('with quoted triple operands and fullTermComparison like', () => {
    // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#sparql-compare
    runFuncTestTable({
      ...fullTermEvalContext,
      testArray: [
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'false' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 123.0 )>>', 'false' ],
        [ '<<( <ex:a> <ex:b> 123e0 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'false' ],
        [ '<<( <ex:a> <ex:b> 9 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 9 )>>', 'false' ],
        [ '<<( <ex:a> <ex:c> 123 )>>', '<<( <ex:a> <ex:b> 9 )>>', 'false' ],
      ],
    });
  });

  describe('with named nodes operands like', () => {
    runFuncTestTable({
      ...config,
      errorArray: [
        [ '<ex:ab>', '<ex:cd>', 'Argument types not valid' ],
        [ '<ex:ad>', '<ex:bc>', 'Argument types not valid' ],
        [ '<ex:ba>', '<ex:ab>', 'Argument types not valid' ],
        [ '<ex:ab>', '<ex:ab>', 'Argument types not valid' ],
      ],
    });
  });

  describe('with named nodes operands and fullTermComparison like', () => {
    runFuncTestTable({
      ...fullTermEvalContext,
      testArray: [
        [ '<ex:ab>', '<ex:cd>', 'true' ],
        [ '<ex:ad>', '<ex:bc>', 'true' ],
        [ '<ex:ba>', '<ex:ab>', 'false' ],
        [ '<ex:ab>', '<ex:ab>', 'false' ],
      ],
    });
  });

  describe('with blank nodes operands like', () => {
    runFuncTestTable({
      ...config,
      errorArray: [
        [ 'BNODE("ab")', 'BNODE("cd")', 'Argument types not valid' ],
        [ 'BNODE("ad")', 'BNODE("bc")', 'Argument types not valid' ],
        [ 'BNODE("ba")', 'BNODE("ab")', 'Argument types not valid' ],
        [ 'BNODE("ab")', 'BNODE("ab")', 'Argument types not valid' ],
      ],
    });
  });

  describe('with blank nodes operands and fullTermComparison like', () => {
    runFuncTestTable({
      ...fullTermEvalContext,
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
      errorArray: [
        [ 'BNODE("ab")', '<ex:ab>', 'Argument types not valid' ],
        [ '<<( <ex:a> <ex:b> 123)>>', '123', 'Argument types not valid' ],
        [ '<ex:ab>', '"ab"', 'Argument types not valid' ],
        [ 'BNODE("ab")', '<<( <ex:a> <ex:b> 123)>>', 'Argument types not valid' ],
      ],
    });
  });

  describe('with mixed terms operands and fullTermComparison like', () => {
    runFuncTestTable({
      ...fullTermEvalContext,
      testArray: [
        [ 'BNODE("ab")', '<ex:ab>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123)>>', '123', 'false' ],
        [ '<ex:ab>', '"ab"', 'true' ],
        [ 'BNODE("ab")', '<<( <ex:a> <ex:b> 123)>>', 'true' ],
      ],
    });
  });
});
