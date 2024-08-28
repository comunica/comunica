import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionMonth } from '../lib/ActorFunctionFactoryTermFunctionMonth';

describe('ActorFunctionFactoryTermFunctionMonth', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionMonth instance', () => {
    let actor: ActorFunctionFactoryTermFunctionMonth;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionMonth({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
