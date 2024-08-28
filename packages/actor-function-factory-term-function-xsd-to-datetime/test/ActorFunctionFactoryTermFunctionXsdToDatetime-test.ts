import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToDatetime } from '../lib/ActorFunctionFactoryTermFunctionXsdToDatetime';

describe('ActorFunctionFactoryTermFunctionXsdToDatetime', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToDatetime instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToDatetime;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToDatetime({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
