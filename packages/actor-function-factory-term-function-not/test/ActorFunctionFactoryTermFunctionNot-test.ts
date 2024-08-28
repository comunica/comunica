import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionNot } from '../lib/ActorFunctionFactoryTermFunctionNot';

describe('ActorFunctionFactoryTermFunctionNot', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionNot instance', () => {
    let actor: ActorFunctionFactoryTermFunctionNot;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionNot({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
