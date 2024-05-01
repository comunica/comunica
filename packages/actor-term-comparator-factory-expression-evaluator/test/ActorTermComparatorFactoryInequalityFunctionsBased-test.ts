import { createFuncMediator } from '@comunica/actor-function-factory-wrapper-all/test/util';
import { Bus } from '@comunica/core';
import { getMockMediatorQueryOperation } from '@comunica/jest';
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
        mediatorFunctionFactory: createFuncMediator(),
        mediatorQueryOperation: getMockMediatorQueryOperation(),
      });
    });

    it('should test', () => {
      // Return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      // Return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
