import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrEnds } from '../lib/ActorFunctionFactoryTermFunctionStrEnds';

describe('ActorFunctionFactoryTermFunctionStrEnds', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrEnds instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrEnds;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrEnds({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
