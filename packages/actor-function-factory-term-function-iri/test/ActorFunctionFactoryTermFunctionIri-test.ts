import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionIri } from '../lib/ActorFunctionFactoryTermFunctionIri';

describe('ActorFunctionFactoryTermFunctionIri', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionIri instance', () => {
    let actor: ActorFunctionFactoryTermFunctionIri;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionIri({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
