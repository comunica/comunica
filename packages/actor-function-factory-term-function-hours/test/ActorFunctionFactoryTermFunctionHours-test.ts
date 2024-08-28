import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionHours } from '../lib/ActorFunctionFactoryTermFunctionHours';

describe('ActorFunctionFactoryTermFunctionHours', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionHours instance', () => {
    let actor: ActorFunctionFactoryTermFunctionHours;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionHours({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
