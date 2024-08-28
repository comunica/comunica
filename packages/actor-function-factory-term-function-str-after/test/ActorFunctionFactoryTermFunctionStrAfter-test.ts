import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrAfter } from '../lib/ActorFunctionFactoryTermFunctionStrAfter';

describe('ActorFunctionFactoryTermFunctionStrAfter', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrAfter instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrAfter;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrAfter({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
