import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrUuid } from '../lib/ActorFunctionFactoryTermFunctionStrUuid';

describe('ActorFunctionFactoryTermFunctionStrUuid', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrUuid instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrUuid;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrUuid({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
