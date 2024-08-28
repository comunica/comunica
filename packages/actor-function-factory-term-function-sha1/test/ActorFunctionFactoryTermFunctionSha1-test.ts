import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSha1 } from '../lib/ActorFunctionFactoryTermFunctionSha1';

describe('ActorFunctionFactoryTermFunctionSha1', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSha1 instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSha1;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSha1({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
