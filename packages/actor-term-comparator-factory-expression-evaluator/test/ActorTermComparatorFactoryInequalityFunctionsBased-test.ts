import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import { ActorFunctionFactoryTermLesserThan } from '@comunica/actor-function-factory-term-lesser-than';
import { ActionContext, Bus } from '@comunica/core';
import {
  createFuncMediator,
  getMockEEActionContext,
  getMockMediatorMergeBindingsContext,
  getMockMediatorQueryOperation,
} from '@comunica/utils-jest';
import {
  ActorTermComparatorFactoryExpressionEvaluator,
} from '../lib';

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
