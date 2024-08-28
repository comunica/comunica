import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToString } from '../lib/ActorFunctionFactoryTermFunctionXsdToString';

describe('ActorFunctionFactoryTermFunctionXsdToString', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToString instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToString;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToString({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
