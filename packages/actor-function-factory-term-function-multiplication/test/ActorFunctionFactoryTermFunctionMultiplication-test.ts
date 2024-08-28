import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionMultiplication } from '../lib/ActorFunctionFactoryTermFunctionMultiplication';

describe('ActorFunctionFactoryTermFunctionMultiplication', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionMultiplication instance', () => {
    let actor: ActorFunctionFactoryTermFunctionMultiplication;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionMultiplication({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
