import type { IBindingsAggregator } from '@comunica/bus-bindings-aggeregator-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { ActionContext } from '@comunica/core';
import { BF, DF, getMockEEFactory, int, makeAggregate } from '@comunica/jest';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { SampleAggregator } from '../lib';

async function runAggregator(aggregator: IBindingsAggregator, input: RDF.Bindings[]): Promise<RDF.Term | undefined> {
  for (const bindings of input) {
    await aggregator.putBindings(bindings);
  }
  return aggregator.result();
}

async function createAggregator({ expressionEvaluatorFactory, context, distinct }: {
  expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
  context: IActionContext;
  distinct: boolean;
}): Promise<SampleAggregator> {
  return new SampleAggregator(
    (await expressionEvaluatorFactory.run({
      algExpr: makeAggregate('sample', distinct).expression,
      context,
    })).expressionEvaluator,
    distinct,
  );
}
describe('SampleAggregator', () => {
  let expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
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

    expressionEvaluatorFactory = getMockEEFactory({
      mediatorQueryOperation,
      mediatorBindingsAggregatorFactory: mediatorQueryOperation,
    });

    context = new ActionContext();
  });

  describe('non distinctive sample', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = await createAggregator({ expressionEvaluatorFactory, context, distinct: false });
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
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = await createAggregator({ expressionEvaluatorFactory, context, distinct: true });
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
