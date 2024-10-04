import { ActorFunctionFactoryTermFunctionAddition } from '@comunica/actor-function-factory-term-function-addition';
import { ActorFunctionFactoryTermFunctionDivision } from '@comunica/actor-function-factory-term-function-division';
import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { createFuncMediator } from '@comunica/bus-function-factory/test/util';
import { Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import {
  getMockEEActionContext,
  getMockMediatorExpressionEvaluatorFactory,
  makeAggregate,
} from '@comunica/utils-expression-evaluator/test/util/helpers';
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
    mediatorFunctionFactory = createFuncMediator([
      args => new ActorFunctionFactoryTermFunctionAddition(args),
      args => new ActorFunctionFactoryTermFunctionDivision(args),
    ], {});

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
        })).resolves.toPassTestVoid();
      });

      it('accepts average 2', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('avg', true),
        })).resolves.toPassTestVoid();
      });

      it('rejects sum', async() => {
        await expect(actor.test({
          context,
          expr: makeAggregate('sum', false),
        })).resolves.toFailTest(exception);
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
