import { ActionContext, Bus } from '@comunica/core';
import { ExpressionEvaluatorFactory } from '@comunica/expression-evaluator';
import type { IExpressionEvaluatorFactory } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { ActorBindingsAggregatorFactorySum } from '../lib';
import { BF, DF, makeAggregate } from './util';

describe('ActorBindingsAggregatorFactorySum', () => {
  let bus: any;
  let expressionEvaluatorFactory: IExpressionEvaluatorFactory;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

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
  });

  describe('An ActorBindingsAggregatorFactoryMax instance', () => {
    let actor: ActorBindingsAggregatorFactorySum;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactorySum({ name: 'actor', bus });
    });

    describe('test', () => {
      it('accepts sum 1', () => {
        return expect(actor.test({
          factory: expressionEvaluatorFactory,
          context: new ActionContext(),
          expr: makeAggregate('sum', false),
        })).resolves.toEqual({});
      });

      it('accepts sum 2', () => {
        return expect(actor.test({
          factory: expressionEvaluatorFactory,
          context: new ActionContext(),
          expr: makeAggregate('sum', true),
        })).resolves.toEqual({});
      });

      it('rejects count', () => {
        return expect(actor.test({
          factory: expressionEvaluatorFactory,
          context: new ActionContext(),
          expr: makeAggregate('count', false),
        })).rejects.toThrow();
      });
    });

    it('should run', () => {
      return expect(actor.run({
        factory: expressionEvaluatorFactory,
        context: new ActionContext(),
        expr: makeAggregate('sum', false),
      })).resolves.toMatchObject({
        aggregator: expect.anything(),
      });
    });
  });
});
