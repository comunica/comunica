import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionContains } from '../lib/ActorFunctionFactoryTermFunctionContains';

describe('ActorFunctionFactoryTermFunctionContains', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionContains instance', () => {
    let actor: ActorFunctionFactoryTermFunctionContains;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionContains({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
