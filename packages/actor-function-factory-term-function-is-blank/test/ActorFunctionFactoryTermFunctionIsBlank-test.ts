import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionIsBlank } from '../lib/ActorFunctionFactoryTermFunctionIsBlank';

describe('ActorFunctionFactoryTermFunctionIsBlank', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionIsBlank instance', () => {
    let actor: ActorFunctionFactoryTermFunctionIsBlank;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionIsBlank({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
