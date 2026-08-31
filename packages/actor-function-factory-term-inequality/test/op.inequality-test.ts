import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import { ActorFunctionFactoryTermTriple } from '@comunica/actor-function-factory-term-triple';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { FuncTestTableConfig } from '@comunica/utils-jest';
import {
  runFuncTestTable,
  bool,
  dateTime,
  dateTyped,
  durationTyped,
  merge,
  numeric,
  str,
  timeTyped,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryTermInequality } from '../lib';

const config: FuncTestTableConfig<object> = {
  registeredActors: [
    args => new ActorFunctionFactoryTermInequality(args),
    args => new ActorFunctionFactoryTermEquality(args),
    args => new ActorFunctionFactoryTermTriple(args),
  ],
  arity: 2,
  operation: '!=',
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

const nonLexicalAndfullTermEvalContext: FuncTestTableConfig<object> = {
  ...config,
  config: new ActionContext({
    [KeysExpressionEvaluator.nonLexicalComparison.name]: true,
    [KeysExpressionEvaluator.fullTermComparison.name]: true,
  }),
};

describe('evaluation of \'!=\'', () => {
  describe('with numeric operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        3i 3i = false
        3d 3d = false
        3f 3f = false
    
        3i -5i = true
        3d -5d = true
        3f -5f = true
    
         3i 3f = false
         3i 3d = false
         3d 3f = false
        -0f 0f = false
    
         INF  INF = false
        -INF -INF = false
         INF  3f  = true
         3f   INF = true
         INF  NaN = true
         NaN  NaN = true
         NaN  3f  = true
         3f   NaN = true
      `,
    });
  });

  describe('with string operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        empty empty = false
        empty aaa   = true
        aaa   aaa   = false
        aaa   bbb   = true
      `,
    });
  });

  describe('with boolean operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        true  true  = false
        true  false = true
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
    
        edge1 edge2   = false
      `,
    });
  });

  describe('with date operants like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-date-equal
    runFuncTestTable({
      ...config,
      operation: '!=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${dateTyped('2004-12-25Z')}' '${dateTyped('2004-12-25+07:00')}' = true
        '${dateTyped('2004-12-25-12:00')}' '${dateTyped('2004-12-26+12:00')}' = false
      `,
    });
  });

  describe('with time operants like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-time-equal
    runFuncTestTable({
      ...config,
      operation: '!=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${timeTyped('08:00:00+09:00')}' '${timeTyped('17:00:00-06:00')}' = true
        '${timeTyped('21:30:00+10:30')}' '${timeTyped('06:00:00-05:00')}' = false
        '${timeTyped('24:00:00+01:00')}' '${timeTyped('00:00:00+01:00')}' = false
      `,
    });
  });

  describe('with duration operants like', () => {
    // These tests are just inverse of the spec tests of =
    runFuncTestTable({
      ...config,
      operation: '!=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${durationTyped('P1Y')}' '${durationTyped('P1Y')}' = false
        '${durationTyped('P1Y')}' '${durationTyped('P12M')}' = false
        '${durationTyped('P1Y')}' '${durationTyped('P365D')}' = true
        '${durationTyped('P0Y')}' '${durationTyped('PT0S')}' = false
        '${durationTyped('P1D')}' '${durationTyped('PT24H')}' = false
        '${durationTyped('P1D')}' '${durationTyped('PT23H')}' = true
        '${durationTyped('PT1H')}' '${durationTyped('PT60M')}' = false
        '${durationTyped('PT1H')}' '${durationTyped('PT3600S')}' = false
        '${durationTyped('-P1Y')}' '${durationTyped('P1Y')}' = true
        '${durationTyped('-P0Y')}' '${durationTyped('PT0S')}' = false
      `,
    });
  });

  describe('with literals of unknown types like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        "2"^^example:string "2"^^example:string = false
      `,
      errorTable: `
        "2"^^example:int "0"^^example:int = 'Equality test for literals with unsupported datatypes'
        "abc"^^example:string "def"^^example:string = 'Equality test for literals with unsupported datatypes'
        "2"^^example:int "abc"^^example:string = 'Equality test for literals with unsupported datatypes'
        "2"^^example:int "2"^^example:string = 'Equality test for literals with unsupported datatypes'
        "2"^^example:string "2"^^example:int = 'Equality test for literals with unsupported datatypes'
        "a"^^example:unknown "b"^^example:unknown = 'Equality test for literals with unsupported datatypes'
        
        "01"^^example:int "2"^^example:int = 'Equality test for literals with unsupported datatypes'
        "100"^^example:int "25"^^example:int = 'Equality test for literals with unsupported datatypes'
      `,
    });
  });

  describe('with literals of unknown types and fullTermComparison like', () => {
    runFuncTestTable({
      ...fullTermEvalContext,
      testTable: `
        "2"^^example:int "0"^^example:int = true
        "abc"^^example:string "def"^^example:string = true
        "2"^^example:int "abc"^^example:string = true
        "2"^^example:int "2"^^example:string = true
        "2"^^example:string "2"^^example:int = true
        "2"^^example:string "2"^^example:string = false
        "a"^^example:unknown "b"^^example:unknown = true
        
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
        "a"^^xsd:boolean     "a"^^xsd:dateTime   = 'Equality test for literals with unsupported datatypes'
        "true"^^xsd:boolean  "a"^^xsd:boolean    = 'Invalid lexical form'
        earlyN               "a"^^xsd:dateTime   = 'Invalid lexical form'
        "true"^^xsd:boolean  "a"^^xsd:dateTime   = 'Equality test for literals with unsupported datatypes'
        
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
        "true"^^xsd:boolean  "a"^^xsd:boolean    = true
        earlyN               "a"^^xsd:dateTime   = true
        
        "a"^^xsd:integer           "b"^^xsd:decimal           = true
        "a"^^xsd:yearMonthDuration "b"^^xsd:yearMonthDuration = true
        "a"^^xsd:dayTimeDuration   "b"^^xsd:dayTimeDuration   = true
        "a"^^xsd:time              "b"^^xsd:time              = true
      `,
      errorTable: `
        "a"^^xsd:boolean     "a"^^xsd:dateTime   = 'Equality test for literals with unsupported datatypes'
        "true"^^xsd:boolean  "a"^^xsd:dateTime   = 'Equality test for literals with unsupported datatypes'
      `,
    });
  });

  describe('with non lexical operands and fullTermComparison like', () => {
    runFuncTestTable({
      ...fullTermEvalContext,
      errorTable: `
        "a"^^xsd:dateTime    "b"^^xsd:dateTime   = 'Invalid lexical form'
        "a"^^xsd:dateTime    "a"^^xsd:dateTime   = 'Invalid lexical form'
        "a"^^xsd:boolean     "b"^^xsd:boolean    = 'Invalid lexical form'
        "a"^^xsd:boolean     "a"^^xsd:dateTime   = 'Invalid lexical form'
        "true"^^xsd:boolean  "a"^^xsd:boolean    = 'Invalid lexical form'
        earlyN               "a"^^xsd:dateTime   = 'Invalid lexical form'
        "true"^^xsd:boolean  "a"^^xsd:dateTime   = 'Invalid lexical form'
        
        "a"^^xsd:integer           "b"^^xsd:decimal           = 'Invalid lexical form'
        "a"^^xsd:yearMonthDuration "b"^^xsd:yearMonthDuration = 'Invalid lexical form'
        "a"^^xsd:dayTimeDuration   "b"^^xsd:dayTimeDuration   = 'Invalid lexical form'
        "a"^^xsd:time              "b"^^xsd:time              = 'Invalid lexical form'
      `,
    });
  });

  describe('with non lexical operands and both comparison options like', () => {
    runFuncTestTable({
      ...nonLexicalAndfullTermEvalContext,
      testTable: `
        "a"^^xsd:dateTime    "b"^^xsd:dateTime   = true
        "a"^^xsd:dateTime    "a"^^xsd:dateTime   = false
        "a"^^xsd:boolean     "b"^^xsd:boolean    = true
        "a"^^xsd:boolean     "a"^^xsd:dateTime   = true
        "true"^^xsd:boolean  "a"^^xsd:boolean    = true
        earlyN               "a"^^xsd:dateTime   = true
        "true"^^xsd:boolean  "a"^^xsd:dateTime   = true
        
        "a"^^xsd:integer           "b"^^xsd:decimal           = true
        "a"^^xsd:yearMonthDuration "b"^^xsd:yearMonthDuration = true
        "a"^^xsd:dayTimeDuration   "b"^^xsd:dayTimeDuration   = true
        "a"^^xsd:time              "b"^^xsd:time              = true
      `,
    });
  });

  describe('with other operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        <http://example.com> <http://example.com> = false
        <http://example.com/a> <http://example.com/b> = true
        <http://example.com> 1 = true
        1 <http://example.com> = true
      `,
      errorTable: `
        1 true = 'Equality test for literals with unsupported datatypes'
        1 aaa = 'Equality test for literals with unsupported datatypes'
        1 earlyN = 'Equality test for literals with unsupported datatypes'
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
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 9 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 9 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'true' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:c> <ex:d> 123 )>>', 'true' ],
      ],
    });
  });
});
