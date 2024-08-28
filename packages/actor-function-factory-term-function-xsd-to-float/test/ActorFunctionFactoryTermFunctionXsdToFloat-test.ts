import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToFloat } from '../lib/ActorFunctionFactoryTermFunctionXsdToFloat';

describe('ActorFunctionFactoryTermFunctionXsdToFloat', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToFloat instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToFloat;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToFloat({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
