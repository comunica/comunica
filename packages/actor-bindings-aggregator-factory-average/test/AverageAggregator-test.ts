import { createFuncMediator } from '@comunica/actor-function-factory-wrapper-all/test/util';
import type { IBindingsAggregator } from '@comunica/bus-bindings-aggeregator-factory';
import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { RegularOperator } from '@comunica/expression-evaluator';
import {
  BF,
  decimal,
  DF,
  double,
  float,
  getMockEEActionContext,
  getMockEEFactory,
  int,
  makeAggregate,
} from '@comunica/jest';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { AverageAggregator } from '../lib/AverageAggregator';

async function runAggregator(aggregator: IBindingsAggregator, input: RDF.Bindings[]): Promise<RDF.Term | undefined> {
  for (const bindings of input) {
    await aggregator.putBindings(bindings);
  }
  return aggregator.result();
}

async function createAggregator({ expressionEvaluatorFactory, context, distinct, mediatorFunctionFactory }: {
  expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
  context: IActionContext;
  distinct: boolean;
  mediatorFunctionFactory: MediatorFunctionFactory;
}): Promise<AverageAggregator> {
  return new AverageAggregator(
    await expressionEvaluatorFactory.run({
      algExpr: makeAggregate('avg', distinct).expression,
      context,
    }),
    distinct,
    await mediatorFunctionFactory.mediate({
      context,
      functionName: RegularOperator.ADDITION,
      requireTermExpression: true,
    }),
    await mediatorFunctionFactory.mediate({
      context,
      functionName: RegularOperator.DIVISION,
      requireTermExpression: true,
    }),
  );
}

describe('AverageAggregator', () => {
  let expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;
  let mediatorFunctionFactory: MediatorFunctionFactory;
  let context: IActionContext;

  beforeEach(() => {
    mediatorFunctionFactory = createFuncMediator();
    expressionEvaluatorFactory = getMockEEFactory({
      mediatorFunctionFactory,
    });

    context = getMockEEActionContext();
  });

  describe('non distinctive avg', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = await createAggregator({
        mediatorFunctionFactory,
        expressionEvaluatorFactory,
        context,
        distinct: false,
      });
    });

    it('a list of bindings', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), float('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([[ DF.variable('x'), int('4') ]]),
      ];

      expect(await runAggregator(aggregator, input)).toEqual(float('2.5'));
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(int('0'));
    });

    it('with respect to type promotion and subtype substitution', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'),
          DF.literal('1', DF.namedNode('http://www.w3.org/2001/XMLSchema#byte')) ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), float('3') ]]),
        BF.bindings([[ DF.variable('x'), DF.literal('4',
          DF.namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')) ]]),
      ];
      expect(await runAggregator(aggregator, input)).toEqual(float('2.5'));
    });

    it('with respect to type preservation', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), int('1') ]]),
        BF.bindings([[ DF.variable('x'), int('2') ]]),
        BF.bindings([[ DF.variable('x'), int('3') ]]),
        BF.bindings([[ DF.variable('x'), int('4') ]]),
      ];
      expect(await runAggregator(aggregator, input)).toEqual(decimal('2.5'));
    });

    it('with respect to type promotion 2', async() => {
      const input = [
        BF.bindings([[ DF.variable('x'), double('1000') ]]),
        BF.bindings([[ DF.variable('x'), int('2000') ]]),
        BF.bindings([[ DF.variable('x'), float('3000') ]]),
        BF.bindings([[ DF.variable('x'), double('4000') ]]),
      ];
      expect(await runAggregator(aggregator, input)).toEqual(double('2.5E3'));
    });
  });

  describe('distinctive avg', () => {
    let aggregator: IBindingsAggregator;

    beforeEach(async() => {
      aggregator = await createAggregator({
        mediatorFunctionFactory,
        expressionEvaluatorFactory,
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

      expect(await runAggregator(aggregator, input)).toEqual(decimal('1.5'));
    });

    it('with respect to empty input', async() => {
      expect(await runAggregator(aggregator, [])).toEqual(int('0'));
    });
  });
});

