import { createFuncMediator } from '@comunica/actor-function-factory-wrapper-all/test/util';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import { Bus } from '@comunica/core';
import { getMockMediatorMergeBindingsContext, getMockMediatorQueryOperation } from '@comunica/jest';
import { ActorTermComparatorFactoryExpressionEvaluator } from '../lib';

export function createTermCompMediator() {
  return <MediatorTermComparatorFactory> {
    async mediate(action) {
      return createTermCompActor().actor.run(action);
    },
  };
}

export function createTermCompActor() {
  const bus: any = new Bus({ name: 'bus' });
  const actor = new ActorTermComparatorFactoryExpressionEvaluator({
    name: 'actor',
    bus,
    mediatorFunctionFactory: createFuncMediator(),
    mediatorQueryOperation: getMockMediatorQueryOperation(),
    mediatorMergeBindingsContext: getMockMediatorMergeBindingsContext(),
  });
  return { actor, bus };
}
