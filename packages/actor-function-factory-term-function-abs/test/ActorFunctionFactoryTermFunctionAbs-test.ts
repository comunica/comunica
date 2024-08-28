import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionAbs } from '../lib/ActorFunctionFactoryTermFunctionAbs';

describe('ActorFunctionFactoryTermFunctionAbs', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionAbs instance', () => {
    let actor: ActorFunctionFactoryTermFunctionAbs;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionAbs({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
