import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrLen } from '../lib/ActorFunctionFactoryTermFunctionStrLen';

describe('ActorFunctionFactoryTermFunctionStrLen', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrLen instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrLen;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrLen({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
