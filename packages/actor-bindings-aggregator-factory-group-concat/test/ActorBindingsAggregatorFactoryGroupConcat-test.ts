import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { ActionContext, Bus } from '@comunica/core';
import { BF, DF, getMockMediatorExpressionEvaluatorFactory, makeAggregate } from '@comunica/jest';
import { ArrayIterator } from 'asynciterator';
import { ActorBindingsAggregatorFactoryGroupConcat } from '../lib';

describe('ActorBindingsAggregatorFactoryGroupConcat', () => {
  let bus: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;

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

    mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory({
      mediatorQueryOperation,
    });
  });

  describe('An ActorBindingsAggregatorFactoryCount instance', () => {
    let actor: ActorBindingsAggregatorFactoryGroupConcat;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactoryGroupConcat({
        name: 'actor',
        bus,
        mediatorExpressionEvaluatorFactory,
      });
    });

    describe('test', () => {
      it('accepts group_concat 1', () => {
        return expect(actor.test({
          context: new ActionContext(),
          expr: makeAggregate('group_concat', false),
        })).resolves.toEqual({});
      });

      it('accepts group_concat 2', () => {
        return expect(actor.test({
          context: new ActionContext(),
          expr: makeAggregate('group_concat', true),
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
        expr: makeAggregate('group_concat', false),
      })).resolves.toMatchObject({});
    });
  });
});
