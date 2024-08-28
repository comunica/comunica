import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionFloor } from '../lib/ActorFunctionFactoryTermFunctionFloor';

describe('ActorFunctionFactoryTermFunctionFloor', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionFloor instance', () => {
    let actor: ActorFunctionFactoryTermFunctionFloor;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionFloor({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
