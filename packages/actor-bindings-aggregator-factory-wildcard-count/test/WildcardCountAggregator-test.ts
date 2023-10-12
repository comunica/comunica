import { ActionContext } from '@comunica/core';
import { ExpressionEvaluatorFactory } from '@comunica/expression-evaluator';
import type { IActionContext, IBindingsAggregator, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { WildcardCountAggregator } from '../lib/WildcardCountAggregator';
import { BF, DF, int, makeAggregate } from './util';

async function runAggregator(aggregator: IBindingsAggregator, input: RDF.Bindings[]): Promise<RDF.Term | undefined> {
  for (const bindings of input) {
    await aggregator.putBindings(bindings);
  }
  return aggregator.result();
}

describe('WildcardCountAggregator', () => {
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

  describe('non distinctive count-wildcard', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(() => {
      aggregator = new WildcardCountAggregator(
        makeAggregate('count', false, true),
        expressionEvaluatorFactory,
        context,
      );
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('y'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(int('4'));
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(int('0'));
    });
  });

  describe('distinctive count-wildcard', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(() => {
      aggregator = new WildcardCountAggregator(
        makeAggregate('count', true, true),
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
        BF.bindings([]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(int('4'));
    });

    it('a list of bindings containing 2 empty', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('y'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([]),
        BF.bindings([]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(int('4'));
    });

    it('a list of bindings 2', async() => {
      const input = [
        BF.bindings([]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ], [ DF.variable('y'), int('1') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(int('4'));
    });

    it('a list of bindings 3', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ], [ DF.variable('y'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(int('4'));
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(int('0'));
    });
  });
});
