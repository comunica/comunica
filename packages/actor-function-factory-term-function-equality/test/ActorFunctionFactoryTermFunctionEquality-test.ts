import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionEquality } from '../lib/ActorFunctionFactoryTermFunctionEquality';

describe('ActorFunctionFactoryTermFunctionEquality', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionEquality instance', () => {
    let actor: ActorFunctionFactoryTermFunctionEquality;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionEquality({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
