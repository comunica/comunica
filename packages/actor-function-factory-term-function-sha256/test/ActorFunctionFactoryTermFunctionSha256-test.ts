import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSha256 } from '../lib/ActorFunctionFactoryTermFunctionSha256';

describe('ActorFunctionFactoryTermFunctionSha256', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSha256 instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSha256;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSha256({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
