import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';

import type { Algebra } from 'sparqlalgebrajs';

import { AggregateEvaluator } from '../../../lib/evaluators/AggregateEvaluator';
import { AsyncAggregateEvaluator } from '../../../lib/evaluators/AsyncAggregateEvaluator';
import { Bindings } from '../../../lib/Types';

const DF = new DataFactory();

interface IBaseTestCaseArgs { expr: Algebra.AggregateExpression; throwError?: boolean; evalTogether?: boolean }
type TestCaseArgs = IBaseTestCaseArgs & { input: Bindings[] };

async function testCase({ expr, input, throwError, evalTogether }: TestCaseArgs): Promise<RDF.Term> {
  const results: (RDF.Term | undefined)[] = [];
  if (input.length === 0) {
    results.push(AggregateEvaluator.emptyValue(expr, throwError || false));
    results.push(AsyncAggregateEvaluator.emptyValue(expr, throwError || false));
  } else {
    // Evaluate both sync and async while awaiting all
    const syncEvaluator = new AggregateEvaluator(expr, undefined, throwError || false);
    const asyncEvaluator = new AsyncAggregateEvaluator(expr, undefined, throwError || false);
    for (const bindings of input) {
      syncEvaluator.put(bindings);
      await asyncEvaluator.put(bindings);
    }
    results.push(syncEvaluator.result());
    results.push(asyncEvaluator.result());
    // If we can evaluate the aggregator all at once, we will test this to
    if (evalTogether) {
      const togetherEvaluator = new AsyncAggregateEvaluator(expr, undefined, throwError || false);
      await Promise.all(input.map(bindings => togetherEvaluator.put(bindings)));
      results.push(togetherEvaluator.result());
    }
  }
  const equalCheck = results.every(((value, index, array) => {
    const other = array[(index + 1) % array.length];
    return (!other && !value) || (value && value.equals(other));
  }));
  // We need to check here because they could be undefined.
  if (!equalCheck) {
    let message = 'Not all results are equal.';
    if (evalTogether) {
      message += ' This might be because the given aggregator can not reliably be evaluated together.';
    }
    throw new Error(message);
  }
  return results[0]!;
}

function makeAggregate(aggregator: string, distinct = false, separator?: string):
Algebra.AggregateExpression {
  return {
    type: 'expression',
    expressionType: 'aggregate',
    aggregator: <any> aggregator,
    distinct,
    separator,
    expression: {
      type: 'expression',
      expressionType: 'term',
      term: DF.variable('x'),
    },
  };
}

function nonLiteral(): RDF.Term {
  return DF.namedNode('http://example.org/');
}

function int(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
}

function float(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#float'));
}

function decimal(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal'));
}

function double(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#double'));
}

function string(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#string'));
}

describe('an aggregate evaluator should be able to', () => {
  describe('count', () => {
    let baseTestCaseArgs: IBaseTestCaseArgs;

    beforeEach(() => {
      baseTestCaseArgs = { expr: makeAggregate('count'), evalTogether: true };
    });
    it('a list of bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(await result).toEqual(int('4'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      expect(await result).toEqual(int('0'));
    });
  });

  describe('sum', () => {
    let baseTestCaseArgs: IBaseTestCaseArgs;
    beforeEach(() => {
      baseTestCaseArgs = { expr: makeAggregate('sum'), evalTogether: true };
    });
    it('a list of bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(await result).toEqual(int('10'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      expect(await result).toEqual(int('0'));
    });

    it('with respect to type promotion', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({
            '?x': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#byte')),
          }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': float('3') }),
          Bindings({
            '?x': DF.literal('4', DF.namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')),
          }),
        ],
      });
      expect(await result).toEqual(float('10'));
    });

    it('with accurate results', async() => {
      const result = testCase({
        expr: makeAggregate('sum'),
        input: [
          Bindings({ '?x': decimal('1.0') }),
          Bindings({ '?x': decimal('2.2') }),
          Bindings({ '?x': decimal('2.2') }),
          Bindings({ '?x': decimal('2.2') }),
          Bindings({ '?x': decimal('3.5') }),
        ],
      });
      expect(await result).toEqual(decimal('11.1'));
    });
  });

  describe('min', () => {
    let baseTestCaseArgs: IBaseTestCaseArgs;

    beforeEach(() => {
      baseTestCaseArgs = { expr: makeAggregate('min'), evalTogether: true };
    });

    it('a list of bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({ '?x': int('4') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('1') }),
        ],
      });
      expect(await result).toEqual(int('1'));
    });

    it('a list of string bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({ '?x': string('11') }),
          Bindings({ '?x': string('2') }),
          Bindings({ '?x': string('1') }),
          Bindings({ '?x': string('3') }),
        ],
      });
      expect(await result).toEqual(string('1'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      expect(await result).toEqual(undefined);
    });
  });

  describe('max', () => {
    let baseTestCaseArgs: IBaseTestCaseArgs;
    beforeEach(() => {
      baseTestCaseArgs = { expr: makeAggregate('max'), evalTogether: true };
    });
    it('a list of bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(await result).toEqual(int('4'));
    });

    it('a list of string bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({ '?x': string('11') }),
          Bindings({ '?x': string('2') }),
          Bindings({ '?x': string('1') }),
          Bindings({ '?x': string('3') }),
        ],
      });
      expect(await result).toEqual(string('3'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      expect(await result).toEqual(undefined);
    });
  });

  describe('avg', () => {
    let baseTestCaseArgs: IBaseTestCaseArgs;
    beforeEach(() => {
      baseTestCaseArgs = { expr: makeAggregate('avg'), evalTogether: true };
    });
    it('a list of bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({ '?x': float('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(await result).toEqual(float('2.5'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      expect(await result).toEqual(int('0'));
    });

    it('with respect to type promotion and subtype substitution', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({
            '?x': DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#byte')),
          }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': float('3') }),
          Bindings({
            '?x': DF.literal('4', DF.namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')),
          }),
        ],
      });
      expect(await result).toEqual(float('2.5'));
    });

    it('with respect to type preservation', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(await result).toEqual(decimal('2.5'));
    });

    it('with respect to type promotion 2', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({ '?x': double('1000') }),
          Bindings({ '?x': int('2000') }),
          Bindings({ '?x': float('3000') }),
          Bindings({ '?x': double('4000') }),
        ],
      });
      expect(await result).toEqual(double('2.5E3'));
    });
  });

  describe('sample', () => {
    let baseTestCaseArgs: IBaseTestCaseArgs;
    beforeEach(() => {
      baseTestCaseArgs = { expr: makeAggregate('sample'), evalTogether: false };
    });
    it('a list of bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(await result).toEqual(int('1'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      expect(await result).toEqual(undefined);
    });
  });

  describe('group_concat', () => {
    let baseTestCaseArgs: IBaseTestCaseArgs;
    beforeEach(() => {
      baseTestCaseArgs = { expr: makeAggregate('group_concat'), evalTogether: false };
    });
    it('a list of bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(await result).toEqual(DF.literal('1 2 3 4'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      expect(await result).toEqual(DF.literal(''));
    });

    it('custom separator', async() => {
      const result = testCase({
        expr: makeAggregate('group_concat', undefined, ';'),
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(await result).toEqual(DF.literal('1;2;3;4'));
    });
  });

  it('on a put', async() => {
    const testCaseArg = {
      expr: makeAggregate('sum'),
      input: [
        Bindings({ '?x': int('1') }),
        Bindings({ '?x': DF.literal('1') }),
      ],
      evalTogether: true,
    };
    expect(await testCase(testCaseArg)).toEqual(undefined);
  });

  it('min should work with different types', async() => {
    const result = testCase({
      expr: makeAggregate('min'),
      input: [
        Bindings({ '?x': double('11.0') }),
        Bindings({ '?x': int('2') }),
        Bindings({ '?x': float('3') }),
      ],
      evalTogether: true,
    });
    expect(await result).toEqual(int('2'));
  });

  it('max should work with different types', async() => {
    const result = testCase({
      expr: makeAggregate('max'),
      input: [
        Bindings({ '?x': double('11.0') }),
        Bindings({ '?x': int('2') }),
        Bindings({ '?x': float('3') }),
      ],
      evalTogether: true,
    });
    expect(await result).toEqual(double('11.0'));
  });

  it('passing a non-literal to max should not be accepted', async() => {
    const result = testCase({
      expr: makeAggregate('max'),
      input: [
        Bindings({ '?x': nonLiteral() }),
        Bindings({ '?x': int('2') }),
        Bindings({ '?x': int('3') }),
      ],
      evalTogether: true,
    });
    expect(await result).toEqual(undefined);
  });

  it('passing a non-literal to sum should not be accepted', async() => {
    const testCaseArg = {
      expr: makeAggregate('sum'),
      input: [
        Bindings({ '?x': nonLiteral() }),
        Bindings({ '?x': int('2') }),
        Bindings({ '?x': int('3') }),
        Bindings({ '?x': int('4') }),
      ],
      evalTogether: true,
    };
    expect(await testCase(testCaseArg)).toBeUndefined();
  });

  describe('when we ask for throwing errors', () => {
    it('and the input is empty', async() => {
      const testCaseArg: TestCaseArgs = {
        expr: makeAggregate('max'),
        input: [],
        throwError: true,
        evalTogether: true,
      };
      await expect(testCase(testCaseArg)).rejects.toThrow('Empty aggregate expression');
    });

    it('and the first value errors', async() => {
      const testCaseArg: TestCaseArgs = {
        expr: makeAggregate('max'),
        input: [
          Bindings({ '?x': nonLiteral() }),
          Bindings({ '?x': int('1') }),
        ],
        throwError: true,
        evalTogether: true,
      };
      await expect(testCase(testCaseArg)).rejects
        .toThrow('Term with value http://example.org/ has type NamedNode and is not a literal');
    });

    it('and any value in the stream errors', async() => {
      const testCaseArg: TestCaseArgs = {
        expr: makeAggregate('max'),
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': nonLiteral() }),
        ],
        evalTogether: true,
        throwError: true,
      };
      await expect(testCase(testCaseArg)).rejects
        .toThrow('Term with value http://example.org/ has type NamedNode and is not a literal');
    });
  });
});
