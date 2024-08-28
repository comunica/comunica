import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionDay } from '../lib/ActorFunctionFactoryTermFunctionDay';

describe('ActorFunctionFactoryTermFunctionDay', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionDay instance', () => {
    let actor: ActorFunctionFactoryTermFunctionDay;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionDay({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
