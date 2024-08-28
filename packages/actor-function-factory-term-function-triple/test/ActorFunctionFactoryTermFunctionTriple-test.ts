import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionTriple } from '../lib/ActorFunctionFactoryTermFunctionTriple';

describe('ActorFunctionFactoryTermFunctionTriple', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionTriple instance', () => {
    let actor: ActorFunctionFactoryTermFunctionTriple;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionTriple({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
