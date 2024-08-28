import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionPredicate } from '../lib/ActorFunctionFactoryTermFunctionPredicate';

describe('ActorFunctionFactoryTermFunctionPredicate', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionPredicate instance', () => {
    let actor: ActorFunctionFactoryTermFunctionPredicate;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionPredicate({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
