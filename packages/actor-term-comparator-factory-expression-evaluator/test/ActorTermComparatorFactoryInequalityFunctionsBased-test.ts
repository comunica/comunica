import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import { ActorFunctionFactoryTermLesserThan } from '@comunica/actor-function-factory-term-lesser-than';
import { createFuncMediator } from '@comunica/bus-function-factory/test/util';
import { ActionContext, Bus } from '@comunica/core';
import {
  getMockEEActionContext,
  getMockMediatorMergeBindingsContext,
  getMockMediatorQueryOperation,
} from '@comunica/utils-expression-evaluator/test/util/helpers';
import {
  ActorTermComparatorFactoryExpressionEvaluator,
} from '../lib';
import '@comunica/utils-jest';

describe('ActorTermComparatorFactoryExpressionEvaluator', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorTermComparatorFactoryExpressionEvaluator instance', () => {
    let actor: ActorTermComparatorFactoryExpressionEvaluator;

    beforeEach(() => {
      actor = new ActorTermComparatorFactoryExpressionEvaluator({
        name: 'actor',
        bus,
        mediatorFunctionFactory: createFuncMediator([
          args => new ActorFunctionFactoryTermEquality(args),
          args => new ActorFunctionFactoryTermLesserThan(args),
        ], {}),
        mediatorQueryOperation: getMockMediatorQueryOperation(),
        mediatorMergeBindingsContext: getMockMediatorMergeBindingsContext(),
      });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext() })).resolves.toPassTestVoid();
    });

    it('should run', async() => {
      await expect(actor.run({ context: getMockEEActionContext() })).resolves.toMatchObject({
        orderTypes: expect.any(Function),
      });
    });
  });
});
