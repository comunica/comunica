import type { IBindingsAggregator } from '@comunica/bus-bindings-aggregator-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActionContext } from '@comunica/types';
import {
  BF,
  DF,
  getMockEEActionContext,
  getMockEEFactory,
  int,
  makeAggregate,
} from '@comunica/utils-expression-evaluator/test/util/helpers';
import type * as RDF from '@rdfjs/types';
import { GroupConcatAggregator } from '../lib/GroupConcatAggregator';

async function runAggregator(aggregator: IBindingsAggregator, input: RDF.Bindings[]): Promise<RDF.Term | undefined> {
  for (const bindings of input) {
    await aggregator.putBindings(bindings);
  }
  return aggregator.result();
}

async function createAggregator({ expressionEvaluatorFactory, context, distinct, separator }: {
  expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
  context: IActionContext;
  distinct: boolean;
  separator?: string;
}): Promise<GroupConcatAggregator> {
  return new GroupConcatAggregator(
    await expressionEvaluatorFactory.run({
      algExpr: makeAggregate('group_concat', distinct, separator).expression,
      context,
    }, undefined),
    distinct,
    context.getSafe(KeysInitQuery.dataFactory),
    separator,
  );
}
describe('CountAggregator', () => {
  let expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
  let context: IActionContext;

  beforeEach(() => {
    expressionEvaluatorFactory = getMockEEFactory();

    context = getMockEEActionContext();
  });

  describe('non distinctive group_concat', () => {
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

      await expect(runAggregator(aggregator, input)).resolves.toEqual(DF.literal('1 2 3 4'));
    });

    it('a list of mixed bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), DF.namedNode('ex:iri') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([[ DF.variable('x'), int('4') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(DF.literal('ex:iri 1 2 3 4'));
    });

    it('with respect to empty input', async() => {
      await expect(runAggregator(aggregator, [])).resolves.toEqual(DF.literal(''));
    });

    it('with a list of language strings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), DF.literal('a', 'en') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('b', 'en') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('c', 'en') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('d', 'en') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(DF.literal('a b c d', 'en'));
    });

    it('with a list of different language strings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), DF.literal('a', 'en') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('b', 'en') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('c', 'nl') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('d', 'en') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(DF.literal('a b c d'));
    });
  });

  describe('with custom separator', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = await createAggregator({ expressionEvaluatorFactory, context, distinct: false, separator: ';' });
    });

    it('uses separator', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([[ DF.variable('x'), int('4') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(DF.literal('1;2;3;4'));
    });
  });

  describe('distinctive group_concat', () => {
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

      await expect(runAggregator(aggregator, input)).resolves.toEqual(DF.literal('1 2'));
    });

    it('with respect to empty input', async() => {
      await expect(runAggregator(aggregator, [])).resolves.toEqual(DF.literal(''));
    });
  });
});
