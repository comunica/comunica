import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrBefore } from '../lib/ActorFunctionFactoryTermFunctionStrBefore';

describe('ActorFunctionFactoryTermFunctionStrBefore', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrBefore instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrBefore;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrBefore({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
