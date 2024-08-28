import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSha384 } from '../lib/ActorFunctionFactoryTermFunctionSha384';

describe('ActorFunctionFactoryTermFunctionSha384', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSha384 instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSha384;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSha384({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
