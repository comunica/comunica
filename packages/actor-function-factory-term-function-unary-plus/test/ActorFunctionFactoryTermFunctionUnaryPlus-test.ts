import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionUnaryPlus } from '../lib/ActorFunctionFactoryTermFunctionUnaryPlus';

describe('ActorFunctionFactoryTermFunctionUnaryPlus', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionUnaryPlus instance', () => {
    let actor: ActorFunctionFactoryTermFunctionUnaryPlus;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionUnaryPlus({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
