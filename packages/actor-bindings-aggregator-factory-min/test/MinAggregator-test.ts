import { createTermCompMediator } from '@comunica/actor-term-comparator-factory-expression-evaluator/test/util';
import type { IBindingsAggregator } from '@comunica/bus-bindings-aggregator-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IActionContext } from '@comunica/types';
import {
  BF,
  date,
  DF,
  double,
  float,
  getMockEEActionContext,
  getMockEEFactory,
  int,
  makeAggregate,
  nonLiteral,
  string,
} from '@comunica/utils-jest';
import type * as RDF from '@rdfjs/types';
import { MinAggregator } from '../lib/MinAggregator';

async function runAggregator(aggregator: IBindingsAggregator, input: RDF.Bindings[]): Promise<RDF.Term | undefined> {
  for (const bindings of input) {
    await aggregator.putBindings(bindings);
  }
  return aggregator.result();
}

async function createAggregator({
  expressionEvaluatorFactory,
  context,
  distinct,
  throwError,
  mediatorTermComparatorFactory,
}: {
  expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
  mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  context: IActionContext;
  distinct: boolean;
  throwError?: boolean;
}): Promise<MinAggregator> {
  return new MinAggregator(
    await expressionEvaluatorFactory.run({
      algExpr: makeAggregate('min', distinct).expression,
      context,
    }, undefined),
    distinct,
    await mediatorTermComparatorFactory.mediate({ context }),
    throwError,
  );
}
describe('MinAggregator', () => {
  let expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
  let mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  let context: IActionContext;

  beforeEach(() => {
    expressionEvaluatorFactory = getMockEEFactory();
    mediatorTermComparatorFactory = createTermCompMediator();

    context = getMockEEActionContext();
  });

  describe('non distinctive min', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = await createAggregator({
        expressionEvaluatorFactory,
        mediatorTermComparatorFactory,
        context,
        distinct: false,
      });
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([[ DF.variable('x'), int('4') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(int('1'));
    });

    it('a list of string bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), string('11') ]]),
        BF.bindings([[ DF.variable('x'), string('2') ]]),
        BF.bindings([[ DF.variable('x'), string('1') ]]),
        BF.bindings([[ DF.variable('x'), string('3') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(string('1'));
    });

    it('a list of date bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), date('2010-06-21Z') ]]),
        BF.bindings([[ DF.variable('x'), date('2010-06-21-08:00') ]]),
        BF.bindings([[ DF.variable('x'), date('2001-07-23') ]]),
        BF.bindings([[ DF.variable('x'), date('2010-06-21+09:00') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(date('2001-07-23'));
    });

    it('should work with different types', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), double('11.0') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), float('3') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(int('2'));
    });

    it('passing a non-literal should not be accepted', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
      ];
      await expect(runAggregator(aggregator, input)).resolves.toBeUndefined();
    });

    it('passing a non-literal should not be accepted even in non-first place', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), nonLiteral() ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
      ];
      await expect(runAggregator(aggregator, input)).resolves.toBeUndefined();
    });

    it('with respect to empty input', async() => {
      await expect(runAggregator(aggregator, [])).resolves.toBeUndefined();
    });
  });

  describe('distinctive Min', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = await createAggregator({
        expressionEvaluatorFactory,
        mediatorTermComparatorFactory,
        context,
        distinct: true,
      });
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('1') ], [ DF.variable('y'), int('1') ]]),
      ];

      await expect(runAggregator(aggregator, input)).resolves.toEqual(int('1'));
    });

    it('with respect to empty input', async() => {
      await expect(runAggregator(aggregator, [])).resolves.toBeUndefined();
    });
  });
});
