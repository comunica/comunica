import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionRound } from '../lib/ActorFunctionFactoryTermFunctionRound';

describe('ActorFunctionFactoryTermFunctionRound', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionRound instance', () => {
    let actor: ActorFunctionFactoryTermFunctionRound;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionRound({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
