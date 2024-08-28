import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionCeil } from '../lib/ActorFunctionFactoryTermFunctionCeil';

describe('ActorFunctionFactoryTermFunctionCeil', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionCeil instance', () => {
    let actor: ActorFunctionFactoryTermFunctionCeil;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionCeil({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
