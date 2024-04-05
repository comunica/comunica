import type { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { ActionContext, Bus } from '@comunica/core';
import { BF, DF, getMockEEFactory, makeAggregate } from '@comunica/jest';
import { ArrayIterator } from 'asynciterator';
import { ActorBindingsAggregatorFactoryMax } from '../lib';

describe('ActorBindingsAggregatorFactoryMax', () => {
  let bus: any;
  let expressionEvaluatorFactory: ActorExpressionEvaluatorFactory;

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

    expressionEvaluatorFactory = getMockEEFactory({
      mediatorQueryOperation,
      mediatorBindingsAggregatorFactory: mediatorQueryOperation,
    });
  });

  describe('An ActorBindingsAggregatorFactoryMax instance', () => {
    let actor: ActorBindingsAggregatorFactoryMax;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactoryMax({ name: 'actor', bus, factory: expressionEvaluatorFactory });
    });

    describe('test', () => {
      it('accepts max 1', () => {
        return expect(actor.test({
          context: new ActionContext(),
          expr: makeAggregate('max', false),
        })).resolves.toEqual({});
      });

      it('accepts max 2', () => {
        return expect(actor.test({
          context: new ActionContext(),
          expr: makeAggregate('max', true),
        })).resolves.toEqual({});
      });

      it('rejects sum', () => {
        return expect(actor.test({
          context: new ActionContext(),
          expr: makeAggregate('sum', false),
        })).rejects.toThrow();
      });
    });

    it('should run', () => {
      return expect(actor.run({
        context: new ActionContext(),
        expr: makeAggregate('max', false),
      })).resolves.toMatchObject({
        aggregator: expect.anything(),
      });
    });
  });
});
