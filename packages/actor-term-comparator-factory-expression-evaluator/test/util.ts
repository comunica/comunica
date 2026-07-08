import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import { ActorFunctionFactoryTermLesserThan } from '@comunica/actor-function-factory-term-lesser-than';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import { Bus } from '@comunica/core';
import {
  createFuncMediator,
  getMockMediatorMergeBindingsContext,
  getMockMediatorQueryOperation,
} from '@comunica/utils-jest';
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
    mediatorFunctionFactory: createFuncMediator([
      args => new ActorFunctionFactoryTermEquality(args),
      args => new ActorFunctionFactoryTermLesserThan(args),
    ], {}),
    mediatorQueryOperation: getMockMediatorQueryOperation(),
    mediatorMergeBindingsContext: getMockMediatorMergeBindingsContext(),
  });
  return { actor, bus };
}
