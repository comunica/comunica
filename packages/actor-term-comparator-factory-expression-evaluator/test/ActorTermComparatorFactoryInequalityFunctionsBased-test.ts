import { createFuncMediator } from '@comunica/actor-function-factory-wrapper-all/test/util';
import { Bus } from '@comunica/core';
import { getMockMediatorMergeBindingsContext, getMockMediatorQueryOperation } from '@comunica/jest';
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
        mediatorMergeBindingsContext: getMockMediatorMergeBindingsContext(),
      });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
