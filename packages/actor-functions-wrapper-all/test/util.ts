import type { MediatorFunctions } from '@comunica/bus-functions';
import { Bus } from '@comunica/core';
import { ActorFunctionsWrapperAll } from '../lib';

export function createFuncActor() {
  const bus: any = new Bus({ name: 'bus' });
  const actor = new ActorFunctionsWrapperAll({ name: 'actor', bus });
  return { actor, bus };
}

export function createFuncMediator(): MediatorFunctions {
  return <MediatorFunctions> {
    async mediate(action) {
      return createFuncActor().actor.run(action);
    },
  };
}
