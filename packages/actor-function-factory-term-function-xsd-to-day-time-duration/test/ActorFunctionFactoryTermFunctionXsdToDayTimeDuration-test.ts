import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToDayTimeDuration } from '../lib/ActorFunctionFactoryTermFunctionXsdToDayTimeDuration';

describe('ActorFunctionFactoryTermFunctionXsdToDayTimeDuration', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToDayTimeDuration instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToDayTimeDuration;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToDayTimeDuration({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
