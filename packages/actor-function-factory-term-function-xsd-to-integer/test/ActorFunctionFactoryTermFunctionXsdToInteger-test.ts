import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToInteger } from '../lib/ActorFunctionFactoryTermFunctionXsdToInteger';

describe('ActorFunctionFactoryTermFunctionXsdToInteger', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToInteger instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToInteger;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToInteger({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
