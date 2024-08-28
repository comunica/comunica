import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToYearMonthDuration } from '../lib/ActorFunctionFactoryTermFunctionXsdToYearMonthDuration';

describe('ActorFunctionFactoryTermFunctionXsdToYearMonthDuration', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToYearMonthDuration instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToYearMonthDuration;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToYearMonthDuration({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
