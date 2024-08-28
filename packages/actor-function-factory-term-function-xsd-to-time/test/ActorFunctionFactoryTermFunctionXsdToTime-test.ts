import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToTime } from '../lib/ActorFunctionFactoryTermFunctionXsdToTime';

describe('ActorFunctionFactoryTermFunctionXsdToTime', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToTime instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToTime;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToTime({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
