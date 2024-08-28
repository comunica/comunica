import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrLan } from '../lib/ActorFunctionFactoryTermFunctionStrLan';

describe('ActorFunctionFactoryTermFunctionStrLan', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrLan instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrLan;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrLan({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
