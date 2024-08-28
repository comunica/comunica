import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionIsIri } from '../lib/ActorFunctionFactoryTermFunctionIsIri';

describe('ActorFunctionFactoryTermFunctionIsIri', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionIsIri instance', () => {
    let actor: ActorFunctionFactoryTermFunctionIsIri;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionIsIri({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
