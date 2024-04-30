import { createFuncMediator } from '@comunica/actor-functions-wrapper-all/test/util';
import type {
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import type { MediatorFunctions } from '@comunica/bus-functions';
import { Bus } from '@comunica/core';
import {
  BF,
  DF, getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
  makeAggregate,
} from '@comunica/jest';
import type { IActionContext } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { ActorBindingsAggregatorFactorySum } from '../lib';

describe('ActorBindingsAggregatorFactorySum', () => {
  let bus: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  let mediatorFunctions: MediatorFunctions;

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
    mediatorFunctions = createFuncMediator();
  });

  describe('An ActorBindingsAggregatorFactoryMax instance', () => {
    let actor: ActorBindingsAggregatorFactorySum;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactorySum({
        name: 'actor',
        bus,
        mediatorExpressionEvaluatorFactory,
        mediatorFunctions,
      });

      context = getMockEEActionContext();
    });

    describe('test', () => {
      it('accepts sum 1', () => {
        return expect(actor.test({
          context,
          expr: makeAggregate('sum', false),
        })).resolves.toEqual({});
      });

      it('accepts sum 2', () => {
        return expect(actor.test({
          context,
          expr: makeAggregate('sum', true),
        })).resolves.toEqual({});
      });

      it('rejects count', () => {
        return expect(actor.test({
          context,
          expr: makeAggregate('count', false),
        })).rejects.toThrow();
      });
    });

    it('should run', () => {
      return expect(actor.run({
        context,
        expr: makeAggregate('sum', false),
      })).resolves.toMatchObject({});
    });
  });
});
