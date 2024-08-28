import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionUcase } from '../lib/ActorFunctionFactoryTermFunctionUcase';

describe('ActorFunctionFactoryTermFunctionUcase', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionUcase instance', () => {
    let actor: ActorFunctionFactoryTermFunctionUcase;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionUcase({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
