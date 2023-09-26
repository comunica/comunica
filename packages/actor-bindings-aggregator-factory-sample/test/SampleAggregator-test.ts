import { ActionContext } from '@comunica/core';
import { ExpressionEvaluatorFactory } from '@comunica/expression-evaluator';
import type { IActionContext, IBindingAggregator, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { SampleAggregator } from '../lib/SampleAggregator';
import { BF, DF, int, makeAggregate } from './util';

async function runAggregator(aggregator: IBindingAggregator, input: RDF.Bindings[]): Promise<RDF.Term | undefined> {
  for (const bindings of input) {
    await aggregator.putBindings(bindings);
  }
  return aggregator.result();
}

describe('SampleAggregator', () => {
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

  describe('non distinctive sample', () => {
    let aggregator: IBindingAggregator;

    beforeEach(() => {
      aggregator = new SampleAggregator(
        makeAggregate('sample', false),
        expressionEvaluatorFactory,
        context,
      );
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([[ DF.variable('x'), int('4') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(int('1'));
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(undefined);
    });
  });

  describe('distinctive sample', () => {
    let aggregator: IBindingAggregator;

    beforeEach(() => {
      aggregator = new SampleAggregator(
        makeAggregate('sample', true),
        expressionEvaluatorFactory,
        context,
      );
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ], [ DF.variable('y'), int('1') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(int('1'));
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(undefined);
    });
  });
});
