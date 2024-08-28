import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToDate } from '../lib/ActorFunctionFactoryTermFunctionXsdToDate';

describe('ActorFunctionFactoryTermFunctionXsdToDate', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToDate instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToDate;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToDate({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
