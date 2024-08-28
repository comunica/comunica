import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionUuid } from '../lib/ActorFunctionFactoryTermFunctionUuid';

describe('ActorFunctionFactoryTermFunctionUuid', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionUuid instance', () => {
    let actor: ActorFunctionFactoryTermFunctionUuid;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionUuid({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
