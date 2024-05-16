import { BindingsFactory } from '@comunica/bindings-factory';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { Algebra } from 'sparqlalgebrajs';
import { Wildcard } from 'sparqljs';
import { AggregateEvaluator, AsyncAggregateEvaluator } from '../../../lib';

const DF = new DataFactory();
const BF = new BindingsFactory();

interface IBaseTestCaseArgs {
  expr: Algebra.AggregateExpression;
  evalTogether?: boolean;
}
type TestCaseArgs = IBaseTestCaseArgs & { input: RDF.Bindings[] };

async function testCase({ expr, input, evalTogether }: TestCaseArgs): Promise<RDF.Term> {
  const results: (RDF.Term | undefined)[] = [];

  if (input.length === 0) {
    results.push(AggregateEvaluator.emptyValue(expr));
    results.push(AsyncAggregateEvaluator.emptyValue(expr));
  }

  // Evaluate both sync and async while awaiting all
  const syncEvaluator = new AggregateEvaluator(expr, undefined, false);
  const asyncEvaluator = new AsyncAggregateEvaluator(expr, undefined, false);
  for (const bindings of input) {
    syncEvaluator.put(bindings);
    await asyncEvaluator.put(bindings);
  }
  results.push(syncEvaluator.result());
  results.push(asyncEvaluator.result());
  // If we can evaluate the aggregator all at once, we will test this to
  if (evalTogether) {
    const togetherEvaluator = new AsyncAggregateEvaluator(expr, undefined, false);
    await Promise.all(input.map(bindings => togetherEvaluator.put(bindings)));
    results.push(togetherEvaluator.result());
  }

  const equalCheck = results.every(((value, index, array) => {
    const other = array[(index + 1) % array.length];
    return (!other && !value) || (value && value.equals(other));
  }));
  // We need to check here because they could be undefined.
  if (!equalCheck) {
    let message = 'Not all results are equal.';
    if (evalTogether) {
      // eslint-disable-next-line ts/restrict-template-expressions
      message += `This might be because the given aggregator can not reliably be evaluated together.\nGot ${results.map(value => JSON.stringify(value))}`;
    }
    throw new Error(message);
  }
  return results[0]!;
}

function syncErrorTestCase({ expr, input }: TestCaseArgs) {
  if (input.length === 0) {
    AggregateEvaluator.emptyValue(expr, true);
  } else {
    const syncEvaluator = new AggregateEvaluator(expr, undefined, true);
    for (const bindings of input) {
      syncEvaluator.put(bindings);
    }
    syncEvaluator.result();
  }
}

async function asyncErrorTestCase({ expr, input }: TestCaseArgs) {
  if (input.length === 0) {
    AsyncAggregateEvaluator.emptyValue(expr, true);
  } else {
    const asyncEvaluator = new AsyncAggregateEvaluator(expr, undefined, true);
    for (const bindings of input) {
      await asyncEvaluator.put(bindings);
    }
    asyncEvaluator.result();
  }
}

function makeAggregate(aggregator: string, distinct = false, separator?: string):
Algebra.AggregateExpression {
  return {
    type: Algebra.types.EXPRESSION,
    expressionType: Algebra.expressionTypes.AGGREGATE,
    aggregator: <any> aggregator,
    distinct,
    separator,
    expression: {
      type: Algebra.types.EXPRESSION,
      expressionType: Algebra.expressionTypes.TERM,
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

function date(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#date'));
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
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
      });
      await expect(result).resolves.toEqual(int('4'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      await expect(result).resolves.toEqual(int('0'));
    });
  });

  describe('count distinct', () => {
    let baseTestCaseArgs: IBaseTestCaseArgs;

    beforeEach(() => {
      baseTestCaseArgs = { expr: makeAggregate('count', true), evalTogether: true };
    });
    it('a list of bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ], [ DF.variable('y'), int('1') ]]),
        ],
      });
      await expect(result).resolves.toEqual(int('2'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      await expect(result).resolves.toEqual(int('0'));
    });
  });

  describe('count wildcard', () => {
    let baseTestCaseArgs: IBaseTestCaseArgs;

    beforeEach(() => {
      baseTestCaseArgs = { expr: {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.AGGREGATE,
        aggregator: 'count',
        distinct: false,
        separator: '',
        expression: {
          type: Algebra.types.EXPRESSION,
          expressionType: Algebra.expressionTypes.WILDCARD,
          wildcard: new Wildcard(),
        },
      }, evalTogether: true };
    });

    it('a list of bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('y'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([]),
        ],
      });
      await expect(result).resolves.toEqual(int('4'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      await expect(result).resolves.toEqual(int('0'));
    });
  });

  describe('count distinct wildcard', () => {
    let baseTestCaseArgs: IBaseTestCaseArgs;

    beforeEach(() => {
      baseTestCaseArgs = { expr: {
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.AGGREGATE,
        aggregator: 'count',
        distinct: true,
        separator: '',
        expression: {
          type: Algebra.types.EXPRESSION,
          expressionType: Algebra.expressionTypes.WILDCARD,
          wildcard: new Wildcard(),
        },
      }, evalTogether: true };
    });

    it('a list of bindings 1', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ], [ DF.variable('y'), int('1') ]]),
          BF.bindings([]),
        ],
      });
      await expect(result).resolves.toEqual(int('4'));
    });

    it('a list of bindings containing 2 empty', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('y'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([]),
          BF.bindings([]),
        ],
      });
      await expect(result).resolves.toEqual(int('4'));
    });

    it('a list of bindings 2', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([]),
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ], [ DF.variable('y'), int('1') ]]),
        ],
      });
      await expect(result).resolves.toEqual(int('4'));
    });

    it('a list of bindings 3', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), int('1') ], [ DF.variable('y'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([]),
        ],
      });
      await expect(result).resolves.toEqual(int('4'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      await expect(result).resolves.toEqual(int('0'));
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
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
      });
      await expect(result).resolves.toEqual(int('10'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      await expect(result).resolves.toEqual(int('0'));
    });

    it('with respect to type promotion', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#byte')) ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), float('3') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('4', DF.namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')) ]]),
        ],
      });
      await expect(result).resolves.toEqual(float('10'));
    });

    it('with accurate results', async() => {
      const result = testCase({
        expr: makeAggregate('sum'),
        input: [
          BF.bindings([[ DF.variable('x'), decimal('1.0') ]]),
          BF.bindings([[ DF.variable('x'), decimal('2.2') ]]),
          BF.bindings([[ DF.variable('x'), decimal('2.2') ]]),
          BF.bindings([[ DF.variable('x'), decimal('2.2') ]]),
          BF.bindings([[ DF.variable('x'), decimal('3.5') ]]),
        ],
      });
      await expect(result).resolves.toEqual(decimal('11.1'));
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
          BF.bindings([[ DF.variable('x'), int('4') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ]]),
        ],
      });
      await expect(result).resolves.toEqual(int('1'));
    });

    it('a list of string bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), string('11') ]]),
          BF.bindings([[ DF.variable('x'), string('2') ]]),
          BF.bindings([[ DF.variable('x'), string('1') ]]),
          BF.bindings([[ DF.variable('x'), string('3') ]]),
        ],
      });
      await expect(result).resolves.toEqual(string('1'));
    });

    it('a list of date bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), date('2010-06-21Z') ]]),
          BF.bindings([[ DF.variable('x'), date('2010-06-21-08:00') ]]),
          BF.bindings([[ DF.variable('x'), date('2001-07-23') ]]),
          BF.bindings([[ DF.variable('x'), date('2010-06-21+09:00') ]]),
        ],
      });
      await expect(result).resolves.toEqual(date('2001-07-23'));
    });

    it('passing a non-literal to max should not be accepted', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
        ],
        evalTogether: true,
      });
      await expect(result).resolves.toBeUndefined();
    });

    it('passing a non-literal to max should not be accepted even in non-first place', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
        ],
        evalTogether: true,
      });
      await expect(result).resolves.toBeUndefined();
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      await expect(result).resolves.toBeUndefined();
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
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
      });
      await expect(result).resolves.toEqual(int('4'));
    });

    it('a list of string bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), string('11') ]]),
          BF.bindings([[ DF.variable('x'), string('2') ]]),
          BF.bindings([[ DF.variable('x'), string('1') ]]),
          BF.bindings([[ DF.variable('x'), string('3') ]]),
        ],
      });
      await expect(result).resolves.toEqual(string('3'));
    });

    it('a list of date bindings', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), date('2010-06-21Z') ]]),
          BF.bindings([[ DF.variable('x'), date('2010-06-21-08:00') ]]),
          BF.bindings([[ DF.variable('x'), date('2001-07-23') ]]),
          BF.bindings([[ DF.variable('x'), date('2010-06-21+09:00') ]]),
        ],
      });
      await expect(result).resolves.toEqual(date('2010-06-21-08:00'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      await expect(result).resolves.toBeUndefined();
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
          BF.bindings([[ DF.variable('x'), float('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
      });
      await expect(result).resolves.toEqual(float('2.5'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      await expect(result).resolves.toEqual(int('0'));
    });

    it('with respect to type promotion and subtype substitution', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#byte')) ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), float('3') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('4', DF.namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')) ]]),
        ],
      });
      await expect(result).resolves.toEqual(float('2.5'));
    });

    it('with respect to type preservation', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
      });
      await expect(result).resolves.toEqual(decimal('2.5'));
    });

    it('with respect to type promotion 2', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), double('1000') ]]),
          BF.bindings([[ DF.variable('x'), int('2000') ]]),
          BF.bindings([[ DF.variable('x'), float('3000') ]]),
          BF.bindings([[ DF.variable('x'), double('4000') ]]),
        ],
      });
      await expect(result).resolves.toEqual(double('2.5E3'));
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
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
      });
      await expect(result).resolves.toEqual(int('1'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      await expect(result).resolves.toBeUndefined();
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
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
      });
      await expect(result).resolves.toEqual(DF.literal('1 2 3 4'));
    });

    it('with respect to empty input', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [],
      });
      await expect(result).resolves.toEqual(DF.literal(''));
    });

    it('custom separator', async() => {
      const result = testCase({
        expr: makeAggregate('group_concat', undefined, ';'),
        input: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), int('2') ]]),
          BF.bindings([[ DF.variable('x'), int('3') ]]),
          BF.bindings([[ DF.variable('x'), int('4') ]]),
        ],
      });
      await expect(result).resolves.toEqual(DF.literal('1;2;3;4'));
    });

    it('with equal languages', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), DF.literal('1', 'en') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('2', 'en') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('3', 'en') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('4', 'en') ]]),
        ],
      });
      await expect(result).resolves.toEqual(DF.literal('1 2 3 4', 'en'));
    });

    it('with non-equal languages', async() => {
      const result = testCase({
        ...baseTestCaseArgs,
        input: [
          BF.bindings([[ DF.variable('x'), DF.literal('1', 'en') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('2', 'nl') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('3', 'en') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('4', 'en') ]]),
        ],
      });
      await expect(result).resolves.toEqual(DF.literal('1 2 3 4'));
    });
  });

  it('on a put', async() => {
    const testCaseArg = {
      expr: makeAggregate('sum'),
      input: [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
      ],
      evalTogether: true,
    };
    await expect(testCase(testCaseArg)).resolves.toBeUndefined();
  });

  it('min should work with different types', async() => {
    const result = testCase({
      expr: makeAggregate('min'),
      input: [
        BF.bindings([[ DF.variable('x'), double('11.0') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), float('3') ]]),
      ],
      evalTogether: true,
    });
    await expect(result).resolves.toEqual(int('2'));
  });

  it('max should work with different types', async() => {
    const result = testCase({
      expr: makeAggregate('max'),
      input: [
        BF.bindings([[ DF.variable('x'), double('11.0') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), float('3') ]]),
      ],
      evalTogether: true,
    });
    await expect(result).resolves.toEqual(double('11.0'));
  });

  it('passing a non-literal to max should not be accepted', async() => {
    const result = testCase({
      expr: makeAggregate('max'),
      input: [
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
      ],
      evalTogether: true,
    });
    await expect(result).resolves.toBeUndefined();
  });

  it('passing a non-literal to max should not be accepted even in non-first place', async() => {
    const result = testCase({
      expr: makeAggregate('max'),
      input: [
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
      ],
      evalTogether: true,
    });
    await expect(result).resolves.toBeUndefined();
  });

  it('passing a non-literal to sum should not be accepted', async() => {
    const testCaseArg = {
      expr: makeAggregate('sum'),
      input: [
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([[ DF.variable('x'), int('4') ]]),
      ],
      evalTogether: true,
    };
    await expect(testCase(testCaseArg)).resolves.toBeUndefined();
  });

  describe('when we ask for throwing errors', () => {
    it('and the input is empty', async() => {
      const testCaseArg: TestCaseArgs = {
        expr: makeAggregate('max'),
        input: [],
      };
      await expect(asyncErrorTestCase(testCaseArg)).rejects.toThrow('Empty aggregate expression');
      expect(() => syncErrorTestCase(testCaseArg)).toThrow('Empty aggregate expression');
    });

    it('and the first value errors', async() => {
      const testCaseArg: TestCaseArgs = {
        expr: makeAggregate('max'),
        input: [
          BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
          BF.bindings([[ DF.variable('x'), int('1') ]]),
        ],
      };
      await expect(asyncErrorTestCase(testCaseArg)).rejects
        .toThrow('Term with value http://example.org/ has type NamedNode and is not a literal');
      expect(() => syncErrorTestCase(testCaseArg))
        .toThrow('Term with value http://example.org/ has type NamedNode and is not a literal');
    });

    it('and any value in the stream errors', async() => {
      const testCaseArg: TestCaseArgs = {
        expr: makeAggregate('max'),
        input: [
          BF.bindings([[ DF.variable('x'), int('1') ]]),
          BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        ],
      };
      await expect(asyncErrorTestCase(testCaseArg)).rejects
        .toThrow('Term with value http://example.org/ has type NamedNode and is not a literal');
      expect(() => syncErrorTestCase(testCaseArg))
        .toThrow('Term with value http://example.org/ has type NamedNode and is not a literal');
    });
  });
});
