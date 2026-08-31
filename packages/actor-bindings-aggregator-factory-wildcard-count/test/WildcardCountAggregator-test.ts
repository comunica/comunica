import type { IBindingsAggregator } from '@comunica/bus-bindings-aggregator-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActionContext } from '@comunica/types';
import {
  BF,
  DF,
  getMockEEActionContext,
  getMockEEFactory,
  termInt,
  makeAggregate,
} from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { WildcardCountAggregator } from '../lib/WildcardCountAggregator';

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
}): Promise<WildcardCountAggregator> {
  return new WildcardCountAggregator(
    await expressionEvaluatorFactory.run({
      algExpr: makeAggregate('count', distinct, undefined, true).expression,
      context,
    }, undefined),
    distinct,
  );
}

describe('WildcardCountAggregator', () => {
  let expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
  let context: IActionContext;

  beforeEach(() => {
    expressionEvaluatorFactory = getMockEEFactory();

    context = getMockEEActionContext();
  });

  describe('non distinctive count-wildcard', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = await createAggregator({ expressionEvaluatorFactory, context, distinct: false });
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([[ DF.variable('y'), termInt('2') ]]),
        BF.bindings([[ DF.variable('x'), termInt('3') ]]),
        BF.bindings([]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(termInt('4'));
    });

    it('with respect to empty input', async() => {
      await expect(runAggregator(aggregator, [])).resolves.toEqual(termInt('0'));
    });

    it('extends the AggregateEvaluator', () => {
      expect((<WildcardCountAggregator> aggregator).termResult).toBeInstanceOf(Function);
      expect((<WildcardCountAggregator> aggregator).putTerm).toBeInstanceOf(Function);
      // Put term does nothing
      expect(() => (<WildcardCountAggregator> aggregator).putTerm(<any> undefined)).not.toThrow();
    });
  });

  describe('distinctive count-wildcard', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = await createAggregator({ expressionEvaluatorFactory, context, distinct: true });
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([[ DF.variable('x'), termInt('2') ]]),
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([[ DF.variable('x'), termInt('1') ], [ DF.variable('y'), termInt('1') ]]),
        BF.bindings([]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(termInt('4'));
    });

    it('a list of bindings containing 2 empty', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([[ DF.variable('y'), termInt('2') ]]),
        BF.bindings([[ DF.variable('x'), termInt('3') ]]),
        BF.bindings([]),
        BF.bindings([]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(termInt('4'));
    });

    it('a list of bindings 2', async() => {
      const input = [
        BF.bindings([]),
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([[ DF.variable('x'), termInt('2') ]]),
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([[ DF.variable('x'), termInt('1') ], [ DF.variable('y'), termInt('1') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(termInt('4'));
    });

    it('a list of bindings 3', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), termInt('1') ], [ DF.variable('y'), termInt('1') ]]),
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([[ DF.variable('x'), termInt('2') ]]),
        BF.bindings([[ DF.variable('x'), termInt('1') ]]),
        BF.bindings([]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(termInt('4'));
    });

    it('with respect to empty input', async() => {
      await expect(runAggregator(aggregator, [])).resolves.toEqual(termInt('0'));
    });
  });
});
