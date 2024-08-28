import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionIsNumeric } from '../lib/ActorFunctionFactoryTermFunctionIsNumeric';

describe('ActorFunctionFactoryTermFunctionIsNumeric', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionIsNumeric instance', () => {
    let actor: ActorFunctionFactoryTermFunctionIsNumeric;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionIsNumeric({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
