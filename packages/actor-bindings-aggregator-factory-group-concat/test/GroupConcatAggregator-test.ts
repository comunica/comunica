import { ActionContext } from '@comunica/core';
import { ExpressionEvaluatorFactory } from '@comunica/expression-evaluator';
import type { IActionContext, IBindingAggregator, IExpressionEvaluatorFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { GroupConcatAggregator } from '../lib/GroupConcatAggregator';
import { BF, DF, int, makeAggregate } from './util';

async function runAggregator(aggregator: IBindingAggregator, input: RDF.Bindings[]): Promise<RDF.Term | undefined> {
  for (const bindings of input) {
    await aggregator.putBindings(bindings);
  }
  return aggregator.result();
}

describe('CountAggregator', () => {
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

  describe('non distinctive group_concat', () => {
    let aggregator: IBindingAggregator;

    beforeEach(() => {
      aggregator = new GroupConcatAggregator(
        makeAggregate('group_concat', false),
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

      expect(await runAggregator(aggregator, input)).toEqual(DF.literal('1 2 3 4'));
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(DF.literal(''));
    });
  });

  describe('with custom separator', () => {
    let aggregator: IBindingAggregator;

    beforeEach(() => {
      aggregator = new GroupConcatAggregator(
        makeAggregate('count', false, ';'),
        expressionEvaluatorFactory,
        context,
      );
    });

    it('uses separator', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([[ DF.variable('x'), int('4') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(DF.literal('1;2;3;4'));
    });
  });

  describe('distinctive group_concat', () => {
    let aggregator: IBindingAggregator;

    beforeEach(() => {
      aggregator = new GroupConcatAggregator(
        makeAggregate('group_concat', true),
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

      expect(await runAggregator(aggregator, input)).toEqual(DF.literal('1 2'));
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(DF.literal(''));
    });
  });
});
