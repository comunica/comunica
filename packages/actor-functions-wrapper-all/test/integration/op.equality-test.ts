import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { TypeURL } from '@comunica/expression-evaluator/lib/util/Consts';
import {
  bool,
  dateTime,
  dateTyped,
  merge,
  numeric,
  str,
  timeTyped,
} from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import type { ITestTableConfigBase } from '@comunica/expression-evaluator/test/util/utils';
import { LRUCache } from 'lru-cache';
import { runFuncTestTable } from '../util';

const config: ITestTableConfigBase = {
  arity: 2,
  operation: '=',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
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
          discoverer: () => TypeURL.XSD_INTEGER,
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

  describe('with date operants like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-date-equal
    runFuncTestTable({
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

  describe('with time operants like', () => {
    // Originates from: https://www.w3.org/TR/xpath-functions/#func-time-equal
    runFuncTestTable({
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

  describe('with other operands like', () => {
    runFuncTestTable({
      ...config,
      testTable: `
        <http://example.com> <http://example.com> = true
        <http://example.com/a> <http://example.com/b> = false
        <http://example.com> 1 = false
        1 <http://example.com> = false
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
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123.0 >>', 'true' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123 >>', 'true' ],
        [ '<< << <ex:a> <ex:b> 123 >> <ex:q> 999 >>', '<< << <ex:a> <ex:b> 123.0 >> <ex:q> 999 >>', 'true' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 123 >>', 'true' ],
        [ '<< <ex:a> <ex:b> 123e0 >>', '<< <ex:a> <ex:b> 123 >>', 'true' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:a> <ex:b> 9 >>', 'false' ],
        [ '<< <ex:a> <ex:b> 9 >>', '<< <ex:a> <ex:b> 123 >>', 'false' ],
        [ '<< <ex:a> <ex:b> 123 >>', '<< <ex:c> <ex:d> 123 >>', 'false' ],
      ],
    });
  });
});
