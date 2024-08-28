import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionYear } from '../lib/ActorFunctionFactoryTermFunctionYear';

describe('ActorFunctionFactoryTermFunctionYear', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionYear instance', () => {
    let actor: ActorFunctionFactoryTermFunctionYear;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionYear({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
