import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSubtraction } from '../lib/ActorFunctionFactoryTermFunctionSubtraction';

describe('ActorFunctionFactoryTermFunctionSubtraction', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSubtraction instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSubtraction;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSubtraction({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
