import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStr } from '../lib/ActorFunctionFactoryTermFunctionStr';

describe('ActorFunctionFactoryTermFunctionStr', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStr instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStr;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStr({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
