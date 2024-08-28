import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionLcase } from '../lib/ActorFunctionFactoryTermFunctionLcase';

describe('ActorFunctionFactoryTermFunctionLcase', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionLcase instance', () => {
    let actor: ActorFunctionFactoryTermFunctionLcase;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionLcase({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
