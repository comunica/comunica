import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionTz } from '../lib/ActorFunctionFactoryTermFunctionTz';

describe('ActorFunctionFactoryTermFunctionTz', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionTz instance', () => {
    let actor: ActorFunctionFactoryTermFunctionTz;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionTz({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
