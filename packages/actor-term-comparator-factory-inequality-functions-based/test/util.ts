import { createFuncMediator } from '@comunica/actor-functions-wrapper-all/test/util';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import { Bus } from '@comunica/core';
import { getMockEEFactory } from '@comunica/jest';
import { ActorTermComparatorFactoryInequalityFunctionsBased } from '../lib';

export function createTermCompMediator() {
  return <MediatorTermComparatorFactory> {
    async mediate(action) {
      return createTermCompActor().actor.run(action);
    },
  };
}

export function createTermCompActor() {
  const bus: any = new Bus({ name: 'bus' });
  const actor = new ActorTermComparatorFactoryInequalityFunctionsBased({
    name: 'actor',
    bus,
    mediatorFunctions: createFuncMediator(),
    mediatorQueryOperation: getMockEEFactory().mediatorQueryOperation,
  });
  return { actor, bus };
}
