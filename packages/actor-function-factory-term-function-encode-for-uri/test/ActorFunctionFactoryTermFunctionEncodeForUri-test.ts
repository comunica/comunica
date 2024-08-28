import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionEncodeForUri } from '../lib/ActorFunctionFactoryTermFunctionEncodeForUri';

describe('ActorFunctionFactoryTermFunctionEncodeForUri', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionEncodeForUri instance', () => {
    let actor: ActorFunctionFactoryTermFunctionEncodeForUri;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionEncodeForUri({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
