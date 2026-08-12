import { ActorFunctionFactoryExpressionBnode } from '@comunica/actor-function-factory-expression-bnode';
import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import { ActorFunctionFactoryTermLesserThan } from '@comunica/actor-function-factory-term-lesser-than';
import {
  ActorFunctionFactoryTermLesserThanEqual,
} from '@comunica/actor-function-factory-term-lesser-than-equal';
import { ActorFunctionFactoryTermTriple } from '@comunica/actor-function-factory-term-triple';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
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
import { ActorFunctionFactoryTermGreaterThanEqual } from '../lib';

const config: FuncTestTableConfig<object> = {
  registeredActors: [
    args => new ActorFunctionFactoryExpressionBnode(args),
    args => new ActorFunctionFactoryTermGreaterThanEqual(args),
    args => new ActorFunctionFactoryTermLesserThanEqual(args),
    args => new ActorFunctionFactoryTermLesserThan(args),
    args => new ActorFunctionFactoryTermEquality(args),
    args => new ActorFunctionFactoryTermTriple(args),
  ],
  arity: 2,
  operation: '>=',
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

  describe('with date operands like', () => {
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

  describe('with time operands like', () => {
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

  describe('with dayTimeDuration operands like', () => {
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
      `,
    });
  });

  describe('with literals of unknown types and fullTermComparison like', () => {
    runFuncTestTable({
      ...fullTermEvalContext,
      testTable: `
        "2"^^example:int "0"^^example:int = true
        "abc"^^example:string "def"^^example:string = false
        "2"^^example:int "abc"^^example:string = false
        "2"^^example:int "2"^^example:string = false
        "2"^^example:string "2"^^example:int = true
        "2"^^example:string "2"^^example:string = true
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
        "true"^^xsd:boolean  "a"^^xsd:boolean    = 'Invalid lexical form'
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
        "a"^^xsd:dateTime    "b"^^xsd:dateTime   = false
        "a"^^xsd:dateTime    "a"^^xsd:dateTime   = true
        "a"^^xsd:boolean     "b"^^xsd:boolean    = false
        "true"^^xsd:boolean  "a"^^xsd:boolean    = true
        earlyN               "a"^^xsd:dateTime   = false
        
        "a"^^xsd:integer           "b"^^xsd:decimal           = false
        "a"^^xsd:yearMonthDuration "b"^^xsd:yearMonthDuration = false
        "a"^^xsd:dayTimeDuration   "b"^^xsd:dayTimeDuration   = false
        "a"^^xsd:time              "b"^^xsd:time              = false
      `,
      errorTable: `
        "a"^^xsd:boolean     "a"^^xsd:dateTime   = 'Argument types not valid'
        "true"^^xsd:boolean  "a"^^xsd:dateTime   = 'Argument types not valid'
      `,
    });
  });

  describe('with quoted triple operands like', () => {
    // Originates from: https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#sparql-compare
    runFuncTestTable({
      ...config,
      testArray: [
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 123.0 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123e0 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 9 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 9 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'false' ],
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
        [ '<ex:ab>', '<ex:cd>', 'false' ],
        [ '<ex:ad>', '<ex:bc>', 'false' ],
        [ '<ex:ba>', '<ex:ab>', 'true' ],
        [ '<ex:ab>', '<ex:ab>', 'true' ],
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
        [ 'BNODE("ab")', 'BNODE("cd")', 'false' ],
        [ 'BNODE("ad")', 'BNODE("bc")', 'false' ],
        [ 'BNODE("ba")', 'BNODE("ab")', 'true' ],
        [ 'BNODE("ab")', 'BNODE("ab")', 'true' ],
      ],
    });
  });

  describe('with mixed terms operands like', () => {
    runFuncTestTable({
      ...config,
      errorArray: [
        [ 'BNODE("ab")', '<ex:ab>', 'Argument types not valid' ],
        [ '<<(<ex:a> <ex:b> 123)>>', '123', 'Argument types not valid' ],
        [ '<ex:ab>', '"ab"', 'Argument types not valid' ],
        [ 'BNODE("ab")', '<<(<ex:a> <ex:b> 123)>>', 'Argument types not valid' ],
      ],
    });
  });

  describe('with mixed terms operands and fullTermComparison like', () => {
    runFuncTestTable({
      ...fullTermEvalContext,
      testArray: [
        [ 'BNODE("ab")', '<ex:ab>', 'false' ],
        [ '<<(<ex:a> <ex:b> 123)>>', '123', 'true' ],
        [ '<ex:ab>', '"ab"', 'false' ],
        [ 'BNODE("ab")', '<<(<ex:a> <ex:b> 123)>>', 'false' ],
      ],
    });
  });
});
