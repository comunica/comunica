import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionRand } from '../lib/ActorFunctionFactoryTermFunctionRand';

describe('ActorFunctionFactoryTermFunctionRand', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionRand instance', () => {
    let actor: ActorFunctionFactoryTermFunctionRand;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionRand({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
