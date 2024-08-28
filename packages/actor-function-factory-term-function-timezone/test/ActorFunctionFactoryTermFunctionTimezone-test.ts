import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionTimezone } from '../lib/ActorFunctionFactoryTermFunctionTimezone';

describe('ActorFunctionFactoryTermFunctionTimezone', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionTimezone instance', () => {
    let actor: ActorFunctionFactoryTermFunctionTimezone;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionTimezone({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
