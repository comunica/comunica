import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSubStr } from '../lib/ActorFunctionFactoryTermFunctionSubStr';

describe('ActorFunctionFactoryTermFunctionSubStr', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSubStr instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSubStr;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSubStr({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
