import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToDuration } from '../lib/ActorFunctionFactoryTermFunctionXsdToDuration';

describe('ActorFunctionFactoryTermFunctionXsdToDuration', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToDuration instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToDuration;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToDuration({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
