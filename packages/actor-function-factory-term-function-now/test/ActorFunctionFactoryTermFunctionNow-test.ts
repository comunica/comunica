import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionNow } from '../lib/ActorFunctionFactoryTermFunctionNow';

describe('ActorFunctionFactoryTermFunctionNow', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionNow instance', () => {
    let actor: ActorFunctionFactoryTermFunctionNow;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionNow({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
