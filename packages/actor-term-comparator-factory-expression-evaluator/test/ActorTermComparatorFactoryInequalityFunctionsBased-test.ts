import { ActorFunctionFactoryTermFunctionEquality } from '@comunica/actor-function-factory-term-function-equality';
import { ActorFunctionFactoryTermFunctionLesserThan } from '@comunica/actor-function-factory-term-function-lesser-than';
import { createFuncMediator } from '@comunica/bus-function-factory/test/util';
import { ActionContext, Bus } from '@comunica/core';
import {
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
          args => new ActorFunctionFactoryTermFunctionEquality(args),
          args => new ActorFunctionFactoryTermFunctionLesserThan(args),
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
