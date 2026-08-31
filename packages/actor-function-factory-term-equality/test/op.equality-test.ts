import { ActorFunctionFactoryTermTriple } from '@comunica/actor-function-factory-term-triple';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import * as Eval from '@comunica/utils-expression-evaluator';
import {
  runFuncTestTable,
  bool,
  dateTime,
  dateTyped,
  merge,
  numeric,
  str,
  timeTyped,
  Notation,
} from '@comunica/utils-jest';
import type { FuncTestTableConfig } from '@comunica/utils-jest';
import { LRUCache } from 'lru-cache';
import { ActorFunctionFactoryTermEquality } from '../lib';

const config: FuncTestTableConfig<object> = {
  registeredActors: [
    args => new ActorFunctionFactoryTermEquality(args),
    args => new ActorFunctionFactoryTermTriple(args),
  ],
  arity: 2,
  operation: '=',
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

describe('evaluation of \'=\'', () => {
  describe('with numeric operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        3i 3i = true
        3d 3d = true
        3f 3f = true
    
        3i -5i = false
        3d -5d = false
        3f -5f = false
    
         3i 3f = true
         3i 3d = true
         3d 3f = true
        -0f 0f = true
    
         INF  INF = true
        -INF -INF = true
         INF  3f  = false
         3f   INF = false
         INF  NaN = false
         NaN  NaN = false
         NaNd NaNd = false
         NaN  3f  = false
         3f   NaN = false
      `,
    });

    describe('with numeric and type discovery like', () => {
      runFuncTestTable({
        ...config,
        config: new ActionContext().set(KeysExpressionEvaluator.superTypeProvider, {
          cache: new LRUCache<string, any>({ max: 1_000 }),
          discoverer: () => Eval.TypeURL.XSD_INTEGER,
        }),
        testTable: `
         "2"^^example:int "2"^^example:int = true
         "2"^^example:int "3"^^example:int = false
      `,
      });
    });
  });

  describe('with string operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        "test1"@en "test1"@en = true
        "test1" "test1" = true
        empty empty = true
        empty aaa   = false
        aaa   aaa   = true
        aaa   bbb   = false
        "test1" "test2" = false
        "test1"@en "test2"@en = false
        "test1" "test2"@en = false
        "test1" "test1"@en = false
        "test1" "test1"^^xsd:normalizedString = true
      `,
    });
  });

  describe('with boolean operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        true  true  = true
        true  false = false
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
    
        edge1 edge2   = true
      `,
    });
  });

  describe('with date operands like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-date-equal
    runFuncTestTable({
      ...config,
      operation: '=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${dateTyped('2004-12-25Z')}' '${dateTyped('2004-12-25+07:00')}' = false
        '${dateTyped('2004-12-25-12:00')}' '${dateTyped('2004-12-26+12:00')}' = true
      `,
    });
  });

  describe('with time operands like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-time-equal
    runFuncTestTable({
      ...config,
      operation: '=',
      arity: 2,
      notation: Notation.Infix,
      aliases: bool,
      testTable: `
        '${timeTyped('08:00:00+09:00')}' '${timeTyped('17:00:00-06:00')}' = false
        '${timeTyped('21:30:00+10:30')}' '${timeTyped('06:00:00-05:00')}' = true
        '${timeTyped('24:00:00+01:00')}' '${timeTyped('00:00:00+01:00')}' = true
      `,
    });
  });

  describe('with literals of unknown types like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        "2"^^example:string "2"^^example:string = true
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
        "2"^^example:int "0"^^example:int = false
        "abc"^^example:string "def"^^example:string = false
        "2"^^example:int "abc"^^example:string = false
        "2"^^example:int "2"^^example:string = false
        "2"^^example:string "2"^^example:int = false
        "2"^^example:string "2"^^example:string = true
        "a"^^example:unknown "b"^^example:unknown = false
        
        "01"^^example:int "2"^^example:int = false
        "100"^^example:int "25"^^example:int = false
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
        "a"^^xsd:dateTime    "b"^^xsd:dateTime   = false
        "a"^^xsd:dateTime    "a"^^xsd:dateTime   = true
        "a"^^xsd:boolean     "b"^^xsd:boolean    = false
        "true"^^xsd:boolean  "a"^^xsd:boolean    = false
        earlyN               "a"^^xsd:dateTime   = false
        
        "a"^^xsd:integer           "b"^^xsd:decimal           = false
        "a"^^xsd:yearMonthDuration "b"^^xsd:yearMonthDuration = false
        "a"^^xsd:dayTimeDuration   "b"^^xsd:dayTimeDuration   = false
        "a"^^xsd:time              "b"^^xsd:time              = false
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
        "a"^^xsd:dateTime    "b"^^xsd:dateTime   = false
        "a"^^xsd:dateTime    "a"^^xsd:dateTime   = true
        "a"^^xsd:boolean     "b"^^xsd:boolean    = false
        "a"^^xsd:boolean     "a"^^xsd:dateTime   = false
        "true"^^xsd:boolean  "a"^^xsd:boolean    = false
        earlyN               "a"^^xsd:dateTime   = false
        "true"^^xsd:boolean  "a"^^xsd:dateTime   = false
        
        "a"^^xsd:integer           "b"^^xsd:decimal           = false
        "a"^^xsd:yearMonthDuration "b"^^xsd:yearMonthDuration = false
        "a"^^xsd:dayTimeDuration   "b"^^xsd:dayTimeDuration   = false
        "a"^^xsd:time              "b"^^xsd:time              = false
      `,
    });
  });

  describe('with other operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        <http://example.com> <http://example.com> = true
        <http://example.com/a> <http://example.com/b> = false
        <http://example.com> 1 = false
        1 <http://example.com> = false
        
        "a"^^xsd:unknown "a"^^xsd:unknown = true
      `,
      errorTable: `
        1 true = 'Equality test for literals with unsupported datatypes'
        1 aaa = 'Equality test for literals with unsupported datatypes'
        1 earlyN = 'Equality test for literals with unsupported datatypes'
        true "foo"^^xsd:boolean = 'Invalid lexical form'
        "foo"^^xsd:boolean true = 'Invalid lexical form'
        1 "foo"^^xsd:boolean = 'Equality test for literals with unsupported datatypes'
        "foo"^^xsd:boolean 1 = 'Equality test for literals with unsupported datatypes'      
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
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:a> <ex:b> 9 )>>', 'false' ],
        [ '<<( <ex:a> <ex:b> 9 )>>', '<<( <ex:a> <ex:b> 123 )>>', 'false' ],
        [ '<<( <ex:a> <ex:b> 123 )>>', '<<( <ex:c> <ex:d> 123 )>>', 'false' ],
      ],
    });
  });
});
