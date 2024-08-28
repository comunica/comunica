import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionAddition } from '../lib/ActorFunctionFactoryTermFunctionAddition';

describe('ActorFunctionFactoryTermFunctionAddition', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionAddition instance', () => {
    let actor: ActorFunctionFactoryTermFunctionAddition;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionAddition({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
