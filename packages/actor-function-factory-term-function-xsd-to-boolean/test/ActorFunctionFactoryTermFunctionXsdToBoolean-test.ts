import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToBoolean } from '../lib/ActorFunctionFactoryTermFunctionXsdToBoolean';

describe('ActorFunctionFactoryTermFunctionXsdToBoolean', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToBoolean instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToBoolean;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToBoolean({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
