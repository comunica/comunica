import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionDatatype } from '../lib/ActorFunctionFactoryTermFunctionDatatype';

describe('ActorFunctionFactoryTermFunctionDatatype', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionDatatype instance', () => {
    let actor: ActorFunctionFactoryTermFunctionDatatype;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionDatatype({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
