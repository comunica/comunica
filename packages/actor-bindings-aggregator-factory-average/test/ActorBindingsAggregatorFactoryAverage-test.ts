import { createFuncMediator } from '@comunica/actor-function-factory-wrapper-all/test/util';
import type {
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { Bus } from '@comunica/core';
import {
  getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
  makeAggregate,
} from '@comunica/jest';
import type { IActionContext } from '@comunica/types';
import { ActorBindingsAggregatorFactoryAverage } from '../lib';

describe('ActorBindingsAggregatorFactoryAverage', () => {
  let bus: any;
  let mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  let mediatorFunctionFactory: MediatorFunctionFactory;
  let context: IActionContext;
  const exception = 'This actor only supports the \'avg\' aggregator.';

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    mediatorExpressionEvaluatorFactory = getMockMediatorExpressionEvaluatorFactory();
    mediatorFunctionFactory = createFuncMediator();

    context = getMockEEActionContext();
  });

  describe('An ActorBindingsAggregatorFactoryCount instance', () => {
    let actor: ActorBindingsAggregatorFactoryAverage;

    beforeEach(() => {
      actor = new ActorBindingsAggregatorFactoryAverage({
        name: 'actor',
        bus,
        mediatorExpressionEvaluatorFactory,
        mediatorFunctionFactory,
      });
    });

    describe('test', () => {
      it('accepts average 1', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('avg', false),
        })).resolves.toEqual({});
      });

      it('accepts average 2', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('avg', true),
        })).resolves.toEqual({});
      });

      it('rejects sum', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('sum', false),
        })).rejects.toThrow(exception);
      });
    });

    it('should run', async() => {
      await expect(actor.run({
        context,
        expr: makeAggregate('avg', false),
      })).resolves.toMatchObject({});
    });
  });
});
