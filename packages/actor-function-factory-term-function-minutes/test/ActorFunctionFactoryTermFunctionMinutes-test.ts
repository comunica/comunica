import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionMinutes } from '../lib/ActorFunctionFactoryTermFunctionMinutes';

describe('ActorFunctionFactoryTermFunctionMinutes', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionMinutes instance', () => {
    let actor: ActorFunctionFactoryTermFunctionMinutes;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionMinutes({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
