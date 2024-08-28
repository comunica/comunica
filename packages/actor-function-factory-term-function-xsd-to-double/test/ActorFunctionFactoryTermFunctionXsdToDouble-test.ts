import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToDouble } from '../lib/ActorFunctionFactoryTermFunctionXsdToDouble';

describe('ActorFunctionFactoryTermFunctionXsdToDouble', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToDouble instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToDouble;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToDouble({ name: 'actor', bus });
    });

    it.todo('should test');

    it.todo('should run');
  });
});
