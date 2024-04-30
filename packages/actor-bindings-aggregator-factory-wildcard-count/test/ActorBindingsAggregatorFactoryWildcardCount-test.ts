import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import { Bus } from '@comunica/core';
import {
  BF,
  DF,
  getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
  makeAggregate,
} from '@comunica/jest';
import type { IActionContext } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { ActorBindingsAggregatorFactoryWildcardCount } from '../lib';

describe('ActorBindingsAggregatorFactoryWildcardCount', () => {
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
    let actor: ActorBindingsAggregatorFactoryWildcardCount;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactoryWildcardCount({
        name: 'actor',
        bus,
        mediatorExpressionEvaluatorFactory,
      });

      context = getMockEEActionContext();
    });

    describe('test', () => {
      it('rejects count 1', () => {
        return expect(actor.test({
          context,
          expr: makeAggregate('count', false),
        })).rejects.toThrow();
      });

      it('rejects count 2', () => {
        return expect(actor.test({
          context,
          expr: makeAggregate('count', true),
        })).rejects.toThrow();
      });

      it('accepts wildcard count 1', () => {
        return expect(actor.test({
          context,
          expr: makeAggregate('count', false, undefined, true),
        })).resolves.toEqual({});
      });

      it('accepts wildcard count 2', () => {
        return expect(actor.test({
          context: getMockEEActionContext(),
          expr: makeAggregate('count', true, undefined, true),
        })).resolves.toEqual({});
      });

      it('rejects sum', () => {
        return expect(actor.test({
          context,
          expr: makeAggregate('sum', false),
        })).rejects.toThrow();
      });
    });

    it('should run', () => {
      return expect(actor.run({
        context,
        expr: makeAggregate('count', false, undefined, true),
      })).resolves.toMatchObject({});
    });
  });
});
