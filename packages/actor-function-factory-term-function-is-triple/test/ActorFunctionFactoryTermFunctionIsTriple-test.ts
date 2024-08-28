import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionIsTriple } from '../lib/ActorFunctionFactoryTermFunctionIsTriple';

describe('ActorFunctionFactoryTermFunctionIsTriple', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionIsTriple instance', () => {
    let actor: ActorFunctionFactoryTermFunctionIsTriple;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionIsTriple({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
