import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionRegex } from '../lib/ActorFunctionFactoryTermFunctionRegex';

describe('ActorFunctionFactoryTermFunctionRegex', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionRegex instance', () => {
    let actor: ActorFunctionFactoryTermFunctionRegex;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionRegex({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
