import { ActionContext } from '@comunica/core';
import { ExpressionEvaluatorFactory } from '@comunica/expression-evaluator';
import { BF, date, DF, double, float, int, makeAggregate, nonLiteral, string } from '@comunica/jest';
import type { IActionContext, IBindingsAggregator, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { MaxAggregator } from '../lib';

async function runAggregator(aggregator: IBindingsAggregator, input: RDF.Bindings[]): Promise<RDF.Term | undefined> {
  for (const bindings of input) {
    await aggregator.putBindings(bindings);
  }
  return aggregator.result();
}

async function createAggregator({ expressionEvaluatorFactory, context, distinct, throwError }: {
  expressionEvaluatorFactory: IExpressionEvaluatorFactory;
  context: IActionContext;
  distinct: boolean;
  throwError?: boolean;
}): Promise<MaxAggregator> {
  return new MaxAggregator(
    await expressionEvaluatorFactory.createEvaluator(makeAggregate('max', distinct).expression, context),
    distinct,
    await expressionEvaluatorFactory.createOrderByEvaluator(context),
    throwError,
  );
}

describe('MaxAggregator', () => {
  let expressionEvaluatorFactory: IExpressionEvaluatorFactory;
  let context: IActionContext;

  beforeEach(() => {
    const mediatorQueryOperation: any = {
      mediate: (arg: any) => Promise.resolve({
        bindingsStream: new ArrayIterator([
          BF.bindings([[ DF.variable('x'), DF.literal('1') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('2') ]]),
          BF.bindings([[ DF.variable('x'), DF.literal('3') ]]),
        ], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 3, canContainUndefs: false, variables: [ DF.variable('x') ]}),
        operated: arg,
        type: 'bindings',
      }),
    };

    expressionEvaluatorFactory = new ExpressionEvaluatorFactory({
      mediatorQueryOperation,
      mediatorBindingsAggregatorFactory: mediatorQueryOperation,
    });

    context = new ActionContext();
  });

  describe('non distinctive max', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = await createAggregator({ expressionEvaluatorFactory, context, distinct: false });
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([[ DF.variable('x'), int('4') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(int('4'));
    });

    it('a list of string bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), string('11') ]]),
        BF.bindings([[ DF.variable('x'), string('2') ]]),
        BF.bindings([[ DF.variable('x'), string('1') ]]),
        BF.bindings([[ DF.variable('x'), string('3') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(string('3'));
    });

    it('a list of date bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), date('2010-06-21Z') ]]),
        BF.bindings([[ DF.variable('x'), date('2010-06-21-08:00') ]]),
        BF.bindings([[ DF.variable('x'), date('2001-07-23') ]]),
        BF.bindings([[ DF.variable('x'), date('2010-06-21+09:00') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(date('2010-06-21-08:00'));
    });

    it('should work with different types', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), double('11.0') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), float('3') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(double('11.0'));
    });

    it('passing a non-literal should not be accepted', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
      ];
      expect(await runAggregator(aggregator, input)).toEqual(undefined);
    });

    it('passing a non-literal should not be accepted even in non-first place', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
      ];
      expect(await runAggregator(aggregator, input)).toEqual(undefined);
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(undefined);
    });
  });

  describe('distinctive max', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = aggregator = await createAggregator({ expressionEvaluatorFactory, context, distinct: true });
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ], [ DF.variable('y'), int('1') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(int('2'));
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(undefined);
    });
  });

  // This describe actually tests the error handling of the base aggregator evaluator class
  describe('when we ask for throwing errors', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = aggregator = await createAggregator({ expressionEvaluatorFactory, context, distinct: false, throwError: true });
    });
    it('and the input is empty', async() => {
      const input: RDF.Bindings[] = [];
      await expect(runAggregator(aggregator, input)).rejects.toThrow('Empty aggregate expression');
    });

    it('and the first value errors', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
      ];
      await expect(runAggregator(aggregator, input)).rejects
        .toThrow('Term with value http://example.org/ has type NamedNode and is not a literal');
    });

    it('and any value in the stream errors', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
      ];
      await expect(runAggregator(aggregator, input)).rejects
        .toThrow('Term with value http://example.org/ has type NamedNode and is not a literal');
    });
  });
});
